// Connection state machine for one G1. See docs/SPEC.md "Session state machine".
import { useEffect, useRef, useState } from "react";
import { AppState, Linking } from "react-native";

import {
  find,
  forgetIdentity,
  G1Session,
  loadIdentity,
  NotFoundError,
  onBluetoothOn,
  ready,
  ReceiptError,
  saveIdentity,
  SetupError,
  type Identity,
  type LogDir,
  type SessionEvents,
} from "./ble/g1";
import { statusReport, type StatusReport } from "./protocol/messages";

/** Why pairing did not finish, in the words the pair screen uses. */
export type PairFailure = "declined" | "not-found" | "no-reply";

export type Phase =
  | { kind: "starting" }
  | { kind: "no-identity" }
  /**
   * `found`: the G1's name once the scan sees it, then Searly connects and asks it to trust this
   * phone. `pressOkAt`: when the G1 started waiting for its OK key (it gives up after 35 s).
   */
  | { kind: "pairing"; found: string | null; pressOkAt: number | null }
  | { kind: "scanning" | "connecting" | "trusting" }
  | { kind: "live" }
  /** `nextAt`: when the next try starts; null while a try is running or the app is in the background. */
  | { kind: "reconnecting"; attempt: number; nextAt: number | null }
  | { kind: "needs-repair" }
  | { kind: "error"; cause: "bluetooth" | "permission"; fix: "retry" | "settings" }
  | { kind: "error"; cause: "pairing"; failure: PairFailure }
  | { kind: "error"; cause: "storage" };

export type G1 = ReturnType<typeof useG1>;

export interface LogEntry {
  t: string;
  dir: LogDir;
  text: string;
}

/** The G1 accepted a command but its reports do not show the change. */
export class NotAppliedError extends Error {}

interface ReportWaiter {
  test(r: StatusReport): boolean;
  done(error?: Error): void;
}

export const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000]; // then every 10 s
// Three missed reports. The G1 reports every 2 s with a probe out, every 10 s when all are docked [HW].
const STALE_MS = 6_000;
const STALE_DOCKED_MS = 30_000;
const CONFIRM_MS = 8_000; // a few report intervals
const MAX_LOG = 500;

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

function stamp(d: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

// Everything below reads refs, not state, so the callbacks captured by effects stay correct.
export function useG1() {
  const [phase, setPhaseState] = useState<Phase>({ kind: "starting" });
  const [paired, setPaired] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [report, setReport] = useState<StatusReport | null>(null);
  const [reportAt, setReportAt] = useState(0);
  const [beat, setBeat] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [log, setLog] = useState<LogEntry[]>([]);

  const phaseRef = useRef(phase);
  const identity = useRef<Identity | null>(null);
  const session = useRef<G1Session | null>(null);
  const flow = useRef(0); // bumped to abandon an in-flight connect or pair
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<number | null>(null); // the next reconnect attempt, if one is due
  const foreground = useRef(AppState.currentState === "active");
  const liveSince = useRef<number | null>(null); // set until the first report after going live
  const waiters = useRef(new Set<ReportWaiter>());
  // The core when each cook began, from the first report seen for its cookUuid (tenths of °F).
  const cookStarts = useRef(new Map<string, number>());

  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };

  const write = (text: string, dir: LogDir = "sys") => {
    console.log(`[g1] ${dir} ${text}`);
    setLog((l) => [...l.slice(-(MAX_LOG - 1)), { t: stamp(new Date()), dir, text }]);
  };

  const remember = (id: Identity) => {
    identity.current = id;
    setPaired(true);
    setName(id.name ?? null);
  };

  const events = (id: number): SessionEvents => ({
    log: write,
    message: (m) => {
      const r = statusReport(m);
      if (!r) return write(`${m.cmdType} ${JSON.stringify(m.cmdData)}`, "rx");
      const p = r.probes[0];
      write(
        `${m.cmdType} ${p ? `${p.cookingState}${p.curTemperature === undefined ? "" : `, core ${p.curTemperature}`}, target ${p.setParams[0]?.setTemperature}` : "no probes"}`,
        "rx",
      );
      if (liveSince.current !== null) {
        write(`first report ${Date.now() - liveSince.current} ms after going live`);
        liveSince.current = null;
      }
      for (const probe of r.probes) {
        if (probe.cookUuid && probe.curTemperature !== undefined && !cookStarts.current.has(probe.cookUuid)) {
          cookStarts.current.set(probe.cookUuid, probe.curTemperature);
        }
      }
      for (const w of waiters.current) if (w.test(r)) w.done();
      setReport(r);
      setReportAt(Date.now());
      setBeat((b) => b + 1);
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

  function setupError(e: SetupError): Phase {
    return { kind: "error", cause: e.kind, fix: e.fix };
  }

  /** Reconnect only while in the foreground (v1); a due attempt waits for the app to return. */
  function reconnect(attempt: number) {
    clearTimeout(timer.current);
    pending.current = attempt;
    if (!foreground.current) return setPhase({ kind: "reconnecting", attempt, nextAt: null });
    const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length) - 1] ?? 10_000;
    setPhase({ kind: "reconnecting", attempt, nextAt: Date.now() + delay });
    write(`retry ${attempt} in ${delay / 1000} s`);
    timer.current = setTimeout(() => void connect(attempt), delay);
  }

  /** Attempt 0 is a user-visible connect; later attempts are background retries. */
  async function connect(attempt: number) {
    const id = identity.current;
    if (!id) return;
    await drop();
    const me = flow.current;
    const alive = () => me === flow.current;
    setPhase(attempt ? { kind: "reconnecting", attempt, nextAt: null } : { kind: "scanning" });
    try {
      await ready(attempt === 0);
      const found = await find(id.peripheralId, attempt ? 10 : 20);
      if (!alive()) return;
      if (found.name && found.name !== id.name) {
        const next = { ...id, name: found.name };
        remember(next);
        await saveIdentity(next);
      }
      if (!attempt) setPhase({ kind: "connecting" });
      const s = await G1Session.connect(found.id, id.deviceId, events(me));
      if (!alive()) return void s.close();
      session.current = s;
      if (!attempt) setPhase({ kind: "trusting" });
      await s.trust(id.userId);
      if (!alive()) return;
      goLive();
      write("live");
    } catch (e) {
      if (!alive()) return;
      write(`connect failed: ${message(e)}`, "err");
      await drop();
      if (e instanceof ReceiptError && e.receipt.cmdError === 11) setPhase({ kind: "needs-repair" });
      else if (e instanceof SetupError) setPhase(setupError(e));
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
    setPhase({ kind: "pairing", found: null, pressOkAt: null });
    try {
      await ready(true);
      const found = await find(undefined, 20);
      if (!alive()) return;
      setPhase({ kind: "pairing", found: found.name || "G1", pressOkAt: null });
      const s = await G1Session.connect(found.id, "", events(me));
      if (!alive()) return void s.close();
      session.current = s;
      const ids = await s.pair(
        () => alive() && setPhase({ kind: "pairing", found: found.name || "G1", pressOkAt: Date.now() }),
      );
      if (!alive()) return;
      const next: Identity = { ...ids, peripheralId: found.id };
      if (found.name) next.name = found.name;
      await saveIdentity(next);
      remember(next);
      goLive();
      write(`paired with ${found.name || found.id}`);
    } catch (e) {
      if (!alive()) return;
      write(`pairing failed: ${message(e)}`, "err");
      await drop();
      if (e instanceof SetupError) return setPhase(setupError(e));
      const failure: PairFailure =
        e instanceof ReceiptError ? "declined" : e instanceof NotFoundError ? "not-found" : "no-reply";
      setPhase({ kind: "error", cause: "pairing", failure });
    }
  }

  /** Stop pairing and go back to where it started. */
  function cancelPair() {
    void drop();
    write("pairing cancelled");
    setPhase(identity.current ? { kind: "needs-repair" } : { kind: "no-identity" });
  }

  /**
   * Send a command and resolve once the receipt succeeds and a later status report shows the change.
   * The receipt alone is not trusted: the G1 acknowledges some commands it then ignores [HW].
   * `onAccepted` runs when the receipt arrives, before the report confirms it.
   */
  async function send(cmdType: string, cmdData: unknown, confirmed: (r: StatusReport) => boolean, onAccepted?: () => void) {
    const s = session.current;
    if (!s || phaseRef.current.kind !== "live") throw new Error("Not connected to the G1");
    let waiter: ReportWaiter | undefined;
    const seen = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => waiter?.done(new NotAppliedError("The G1 accepted it, but its reports don't show the change")), CONFIRM_MS);
      waiter = {
        test: confirmed,
        done: (error) => {
          clearTimeout(timer);
          waiters.current.delete(waiter!);
          if (error) reject(error);
          else resolve();
        },
      };
      waiters.current.add(waiter);
    });
    seen.catch(() => undefined); // awaited below unless the request fails first
    try {
      const r = await s.request(cmdType, cmdData, 10_000);
      if (r.executeResult !== "success") throw new ReceiptError(r);
      write(`${cmdType} accepted; waiting for a report to confirm`);
      onAccepted?.();
    } catch (e) {
      waiter?.done(e instanceof Error ? e : new Error(message(e)));
      throw e;
    }
    try {
      await seen;
    } catch (e) {
      write(message(e), "err");
      throw e;
    }
    write(`${cmdType} confirmed by a status report`);
  }

  /** The footer action on error screens. */
  function retry() {
    const p = phaseRef.current;
    if (p.kind === "error" && p.cause === "storage") return void load();
    if (p.kind === "error" && p.cause !== "pairing" && p.fix === "settings") return void Linking.openSettings();
    void (identity.current && !(p.kind === "error" && p.cause === "pairing") ? connect(0) : pair());
  }

  /** "Try now": connect straight away instead of waiting for the next scheduled try. */
  function retryNow() {
    write("try now");
    void connect(0);
  }

  /** Delete the stored identity. The G1 keeps its pairing until another client pairs. */
  async function forget() {
    await drop();
    await forgetIdentity();
    identity.current = null;
    setPaired(false);
    setName(null);
    setReport(null);
    setPhase({ kind: "no-identity" });
    write("forgot this G1");
  }

  function load() {
    loadIdentity().then(
      (id) => {
        if (id) {
          remember(id);
          void connect(0);
        } else setPhase({ kind: "no-identity" });
      },
      (e: unknown) => {
        write(`could not read the pairing: ${message(e)}`, "err");
        setPhase({ kind: "error", cause: "storage" });
      },
    );
  }

  useEffect(() => {
    load();
    const app = AppState.addEventListener("change", (state) => {
      foreground.current = state === "active";
      const p = phaseRef.current;
      if (!foreground.current) clearTimeout(timer.current);
      else if (pending.current !== null) reconnect(pending.current);
      // Back from Settings with the permission granted, or not: try again either way.
      else if (p.kind === "error" && p.cause === "permission" && p.fix === "settings") {
        void (identity.current ? connect(0) : pair());
      }
    });
    const bluetooth = onBluetoothOn(() => {
      const p = phaseRef.current;
      if (p.kind !== "error" || p.cause !== "bluetooth") return;
      // Paired: reconnect by itself. Not yet: back to the pairing steps.
      if (identity.current) void connect(0);
      else setPhase({ kind: "no-identity" });
    });
    return () => {
      app.remove();
      bluetooth.remove();
      void drop();
    };
  }, []);

  const ticking = phase.kind === "live" || phase.kind === "reconnecting";
  useEffect(() => {
    if (!ticking) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(t);
  }, [ticking]);
  const silentFor = report ? Math.max(0, now - reportAt) : 0;
  const docked = report?.probes.every((p) => p.curTemperature === undefined) ?? false;

  return {
    phase,
    paired,
    /** The G1's advertised name, such as TM-WT10-3F2A, once known. */
    name,
    report,
    /** Increments on every status report: the heartbeat. */
    beat,
    /** ms since the last status report */
    silentFor,
    /** No fresh data: the link is down, or three reports were missed. */
    stale: report !== null && (phase.kind !== "live" || silentFor > (docked ? STALE_DOCKED_MS : STALE_MS)),
    /** The core when this cook began, in tenths of °F, from the first report seen for it. */
    cookStart: (cookUuid: string | undefined) => (cookUuid ? cookStarts.current.get(cookUuid) : undefined),
    log,
    pair: () => void pair(),
    cancelPair,
    send,
    retry,
    retryNow,
    forget: () => void forget(),
  };
}
