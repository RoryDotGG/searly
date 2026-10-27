// Connection state machine for one G1. See docs/SPEC.md "Session state machine".
import { useEffect, useRef, useState } from "react";
import { AppState, Linking } from "react-native";

import {
  find,
  forgetIdentity,
  G1Session,
  loadIdentity,
  onBluetoothOn,
  ready,
  ReceiptError,
  saveIdentity,
  SetupError,
  type Identity,
  type SessionEvents,
} from "./ble/g1";
import { statusReport, type StatusReport } from "./protocol/messages";

export type Phase =
  | { kind: "starting" }
  | { kind: "no-identity" }
  | { kind: "pairing"; pressOk: boolean }
  | { kind: "scanning" | "connecting" | "trusting" }
  | { kind: "live" }
  | { kind: "reconnecting"; attempt: number }
  | { kind: "needs-repair" }
  | { kind: "error"; reason: string; fix: "retry" | "settings" };

export type G1 = ReturnType<typeof useG1>;

const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000]; // then every 10 s
const STALE_MS = 6_000;
const MAX_LOG = 200;

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

// Everything below reads refs, not state, so the callbacks captured by effects stay correct.
export function useG1() {
  const [phase, setPhaseState] = useState<Phase>({ kind: "starting" });
  const [paired, setPaired] = useState(false);
  const [report, setReport] = useState<StatusReport | null>(null);
  const [reportAt, setReportAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [log, setLog] = useState<string[]>([]);

  const phaseRef = useRef(phase);
  const identity = useRef<Identity | null>(null);
  const session = useRef<G1Session | null>(null);
  const flow = useRef(0); // bumped to abandon an in-flight connect or pair
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<number | null>(null); // the next reconnect attempt, if one is due
  const foreground = useRef(AppState.currentState === "active");
  const liveSince = useRef<number | null>(null); // set until the first report after going live

  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };

  const write = (line: string) => {
    console.log(`[g1] ${line}`);
    setLog((l) => [...l.slice(-(MAX_LOG - 1)), `${new Date().toLocaleTimeString()} ${line}`]);
  };

  const events = (id: number): SessionEvents => ({
    log: write,
    message: (m) => {
      const r = statusReport(m);
      if (!r) return write(JSON.stringify(m));
      if (liveSince.current !== null) {
        write(`first report ${Date.now() - liveSince.current} ms after going live`);
        liveSince.current = null;
      }
      setReport(r);
      setReportAt(Date.now());
    },
    disconnected: (reason) => {
      write(reason);
      // A connect or pair in progress handles its own failures.
      if (id !== flow.current || phaseRef.current.kind !== "live") return;
      session.current = null;
      reconnect(1);
    },
  });

  /** Abandon whatever is running and close the connection. */
  async function drop() {
    flow.current += 1;
    clearTimeout(timer.current);
    pending.current = null;
    const s = session.current;
    session.current = null;
    await s?.close();
  }

  function goLive() {
    liveSince.current = Date.now();
    setReportAt(Date.now()); // the stale clock starts now
    setPhase({ kind: "live" });
  }

  /** Reconnect only while in the foreground (v1); a due attempt waits for the app to return. */
  function reconnect(attempt: number) {
    setPhase({ kind: "reconnecting", attempt });
    clearTimeout(timer.current);
    pending.current = attempt;
    if (!foreground.current) return;
    const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length) - 1];
    timer.current = setTimeout(() => void connect(attempt), delay);
  }

  /** Attempt 0 is a user-visible connect; later attempts are background retries. */
  async function connect(attempt: number) {
    const id = identity.current;
    if (!id) return;
    await drop();
    const me = flow.current;
    const alive = () => me === flow.current;
    setPhase(attempt ? { kind: "reconnecting", attempt } : { kind: "scanning" });
    try {
      await ready(attempt === 0);
      const peripheralId = await find(id.peripheralId, attempt ? 10 : 20);
      if (!alive()) return;
      if (!attempt) setPhase({ kind: "connecting" });
      const s = await G1Session.connect(peripheralId, id.deviceId, events(me));
      if (!alive()) return void s.close();
      session.current = s;
      if (!attempt) setPhase({ kind: "trusting" });
      await s.trust(id.userId);
      if (!alive()) return;
      goLive();
      write("live");
    } catch (e) {
      if (!alive()) return;
      write(`connect failed: ${message(e)}`);
      await drop();
      if (e instanceof ReceiptError && e.receipt.cmdError === 11) setPhase({ kind: "needs-repair" });
      else if (e instanceof SetupError) setPhase({ kind: "error", reason: e.message, fix: e.fix });
      // Not found, no reply, dropped link: keep trying. A hard-killed app can leave the G1
      // unresponsive for a moment [HW].
      else reconnect(attempt + 1);
    }
  }

  /** First-time pairing. A stored identity is only replaced once the new one succeeds. */
  async function pair() {
    await drop();
    const me = flow.current;
    const alive = () => me === flow.current;
    setPhase({ kind: "pairing", pressOk: false });
    try {
      await ready(true);
      const peripheralId = await find(undefined, 20);
      if (!alive()) return;
      const s = await G1Session.connect(peripheralId, "", events(me));
      if (!alive()) return void s.close();
      session.current = s;
      const ids = await s.pair(() => alive() && setPhase({ kind: "pairing", pressOk: true }));
      if (!alive()) return;
      const next = { ...ids, peripheralId };
      await saveIdentity(next);
      identity.current = next;
      setPaired(true);
      goLive();
      write(`paired with ${peripheralId}`);
    } catch (e) {
      if (!alive()) return;
      write(`pairing failed: ${message(e)}`);
      await drop();
      setPhase({ kind: "error", reason: message(e), fix: e instanceof SetupError ? e.fix : "retry" });
    }
  }

  function retry() {
    const p = phaseRef.current;
    if (p.kind === "error" && p.fix === "settings") return void Linking.openSettings();
    void (identity.current ? connect(0) : pair());
  }

  /** Delete the stored identity. The G1 keeps its pairing until another client pairs. */
  async function forget() {
    await drop();
    await forgetIdentity();
    identity.current = null;
    setPaired(false);
    setReport(null);
    setPhase({ kind: "no-identity" });
    write("forgot this G1");
  }

  useEffect(() => {
    loadIdentity().then(
      (id) => {
        identity.current = id;
        setPaired(id !== null);
        if (id) void connect(0);
        else setPhase({ kind: "no-identity" });
      },
      (e: unknown) => setPhase({ kind: "error", reason: `Could not read the pairing: ${message(e)}`, fix: "retry" }),
    );
    const app = AppState.addEventListener("change", (state) => {
      foreground.current = state === "active";
      const p = phaseRef.current;
      if (!foreground.current) clearTimeout(timer.current);
      else if (pending.current !== null) reconnect(pending.current);
      // Back from Settings with the permission granted, or not: try again either way.
      else if (p.kind === "error" && p.fix === "settings") void (identity.current ? connect(0) : pair());
    });
    const bluetooth = onBluetoothOn(() => {
      if (phaseRef.current.kind === "error" && identity.current) void connect(0);
    });
    return () => {
      app.remove();
      bluetooth.remove();
      void drop();
    };
  }, []);

  const live = phase.kind === "live";
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(t);
  }, [live]);
  const silentFor = live ? Math.max(0, now - reportAt) : 0;

  return {
    phase,
    paired,
    report,
    /** ms since the last status report; stale after 6 s */
    silentFor,
    stale: silentFor > STALE_MS,
    log,
    pair: () => void pair(),
    retry,
    forget: () => void forget(),
  };
}
