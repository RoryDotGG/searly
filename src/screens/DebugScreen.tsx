// Hardware milestone screen: pair, reconnect, and print what the G1 sends. Becomes the debug log
// behind a long press once LiveScreen exists.
import { useEffect, useRef, useState } from "react";
import { Button, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from "react-native";

import {
  find,
  forgetIdentity,
  G1Session,
  loadIdentity,
  ready,
  requestPermissions,
  saveIdentity,
  type Identity,
  type SessionEvents,
} from "../ble/g1";
import { fromTenthsF, type Incoming, type StatusReport } from "../protocol/messages";

const MAX_LINES = 200;

export default function DebugScreen() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [report, setReport] = useState("No status report yet");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const session = useRef<G1Session | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);

  const log = (line: string) => {
    console.log(`[g1] ${line}`); // also in the Metro terminal, for hardware runs
    setLines((l) => [...l.slice(-(MAX_LINES - 1)), `${new Date().toLocaleTimeString()} ${line}`]);
  };

  const events: SessionEvents = {
    log,
    message: (m: Incoming) => {
      if (m.cmdType.endsWith(":status:report")) setReport(summary(m.cmdData as StatusReport));
      else log(JSON.stringify(m));
    },
    disconnected: (reason) => {
      setConnected(false);
      session.current = null;
      log(reason);
    },
  };

  useEffect(() => {
    loadIdentity().then(setIdentity, (e: unknown) => log(`could not read identity: ${String(e)}`));
    return () => void session.current?.close();
  }, []);

  async function run(label: string, task: () => Promise<void>) {
    setBusy(true);
    log(label);
    try {
      if (!(await requestPermissions())) throw new Error("Bluetooth permission denied");
      await ready();
      await task();
    } catch (e) {
      log(`failed: ${e instanceof Error ? e.message : String(e)}`);
      await session.current?.close();
    } finally {
      setBusy(false);
    }
  }

  const pair = () =>
    run("pairing: put the probe in the dock. This replaces the G1's current owner", async () => {
      const peripheralId = await find();
      const s = await G1Session.connect(peripheralId, "", events);
      session.current = s;
      setConnected(true);
      const ids = await s.pair(() => log("press OK on the G1"));
      const next = { ...ids, peripheralId };
      await saveIdentity(next);
      setIdentity(next);
      log(`paired with ${peripheralId}; identity saved`);
    });

  const connect = (id: Identity) =>
    run(`scanning for ${id.peripheralId}`, async () => {
      const s = await G1Session.connect(await find(id.peripheralId), id.deviceId, events);
      session.current = s;
      setConnected(true);
      await s.trust(id.userId);
      log("trusted; status reports should arrive every 2 s");
    });

  const forget = async () => {
    await session.current?.close();
    await forgetIdentity();
    setIdentity(null);
    log("identity forgotten (the G1 still has it)");
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Searly debug</Text>
      <Text style={styles.mono}>{identity ? `G1 ${identity.peripheralId}` : "Not paired"}</Text>
      <Text style={styles.report}>{report}</Text>
      <View style={styles.buttons}>
        {connected ? (
          <Button title="Disconnect" onPress={() => void session.current?.close()} />
        ) : identity ? (
          <Button title="Connect" disabled={busy} onPress={() => void connect(identity)} />
        ) : (
          <Button title="Pair" disabled={busy} onPress={() => void pair()} />
        )}
        {identity && !busy ? <Button title="Forget" color="#a33" onPress={() => void forget()} /> : null}
      </View>
      <ScrollView
        style={styles.log}
        ref={scroll}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
      >
        {lines.map((l, i) => (
          <Text key={i} style={styles.mono} selectable>
            {l}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

function summary(d: StatusReport): string {
  const c = (t: number | undefined) => (t === undefined ? "?" : `${fromTenthsF(t, "C").toFixed(1)}°C`);
  const probes = (d.probes ?? []).map((p) =>
    p.curTemperature === undefined
      ? `${p.probeColor} ${p.cookingState}`
      : `${p.probeColor} ${p.cookingState} ${c(p.curTemperature)} ambient ${c(p.curAmbientTemperature)} ` +
        `target ${c(p.setParams[0]?.setTemperature)} bat ${p.batteryValue ?? "?"}%`,
  );
  return [`base bat ${d.batteryValue}%`, ...probes].join("\n");
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff", paddingTop: 56, paddingHorizontal: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: "600" },
  report: { fontSize: 18 },
  buttons: { flexDirection: "row", gap: 12 },
  log: { flex: 1, backgroundColor: "#f4f4f4", padding: 8, marginBottom: 32 },
  mono: { fontFamily: "monospace", fontSize: 12 },
});
