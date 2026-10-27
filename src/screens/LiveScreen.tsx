import { useEffect, useState } from "react";
import { Button, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { loadUnit, saveUnit } from "../prefs";
import { fromTenthsF, type Probe, type Unit } from "../protocol/messages";
import type { G1 } from "../useG1";
import CookModal from "./CookModal";
import DebugLog from "./DebugLog";
import SettingsModal from "./SettingsModal";

export default function LiveScreen({ g1 }: { g1: G1 }) {
  const [showLog, setShowLog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cookFor, setCookFor] = useState<string | null>(null); // probeColor
  const [unit, setUnit] = useState<Unit>("C");
  const { phase, report } = g1;
  const live = phase.kind === "live";
  const dim = !live || g1.stale;
  const cookProbe = report?.probes.find((p) => p.probeColor === cookFor);

  useEffect(() => {
    loadUnit().then(setUnit, () => undefined);
  }, []);

  const changeUnit = (u: Unit) => {
    setUnit(u);
    void saveUnit(u);
  };

  return (
    <View style={styles.screen}>
      <Pressable style={styles.header} onLongPress={() => setShowLog(true)}>
        <Text style={styles.title}>Searly</Text>
        <View style={styles.headerRight}>
          <Text style={[styles.connection, dim && styles.warn]}>{connection(g1)}</Text>
          {report ? <Text style={styles.muted}>G1 battery {report.batteryValue}%</Text> : null}
        </View>
        <Button title="Settings" onPress={() => setShowSettings(true)} />
      </Pressable>
      {phase.kind === "error" ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{phase.reason}</Text>
          <Button title={phase.fix === "settings" ? "Open settings" : "Try again"} onPress={g1.retry} />
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.cards}>
        {report ? (
          report.probes.map((p) => (
            <ProbeCard
              key={p.probeColor}
              probe={p}
              unit={unit}
              dim={dim}
              onCook={live && !g1.stale ? () => setCookFor(p.probeColor) : undefined}
            />
          ))
        ) : (
          <Text style={styles.muted}>Waiting for the G1…</Text>
        )}
      </ScrollView>
      {cookProbe && live ? (
        <CookModal g1={g1} probe={cookProbe} unit={unit} onClose={() => setCookFor(null)} />
      ) : null}
      {showSettings ? (
        <SettingsModal g1={g1} unit={unit} onUnit={changeUnit} onClose={() => setShowSettings(false)} />
      ) : null}
      <DebugLog g1={g1} visible={showLog} onClose={() => setShowLog(false)} />
    </View>
  );
}

function connection(g1: G1): string {
  const { phase } = g1;
  switch (phase.kind) {
    case "live":
      return g1.stale ? `No data for ${Math.round(g1.silentFor / 1000)} s` : "Connected";
    case "reconnecting":
      return `Reconnecting (attempt ${phase.attempt})`;
    case "scanning":
      return "Looking for the G1";
    case "connecting":
    case "trusting":
      return "Connecting";
    default:
      return "Not connected";
  }
}

function ProbeCard(props: { probe: Probe; unit: Unit; dim: boolean; onCook: (() => void) | undefined }) {
  const { probe: p, unit, dim } = props;
  const docked = p.curTemperature === undefined;
  const temp = (t: number | undefined) => (t === undefined ? "–" : `${fromTenthsF(t, unit).toFixed(1)} °${unit}`);
  return (
    <View style={[styles.card, dim && styles.dim]}>
      <View style={styles.row}>
        <Text style={styles.probeName}>{p.probeColor.replace(/^probe(\d+)$/, "Probe $1")}</Text>
        {p.batteryValue !== undefined ? <Text style={styles.muted}>Battery {p.batteryValue}%</Text> : null}
      </View>
      {docked ? (
        <>
          <Text style={styles.docked}>Docked, charging</Text>
          {/* The G1 acknowledges a start while docked but ignores it; undocking starts a cook [HW]. */}
          <Text style={styles.muted}>Take the probe out of the dock to start a cook.</Text>
        </>
      ) : (
        <>
          <Text style={styles.core}>{temp(p.curTemperature)}</Text>
          <Text style={styles.detail}>
            Ambient {temp(p.curAmbientTemperature)} · Target {temp(p.setParams[0]?.setTemperature)}
          </Text>
          <Zones values={p.areaTemperature ?? []} unit={unit} />
          <Text style={styles.detail}>
            {title(p.cookingState)} · {title(p.cookingMode)} · {clock(p.curCookSec)}
          </Text>
        </>
      )}
      {props.onCook && !docked ? (
        <Button title={p.cookingState === "cooking" ? "Change target" : "Start cook"} onPress={props.onCook} />
      ) : null}
    </View>
  );
}

/** The five probe zones, tip first. */
function Zones({ values, unit }: { values: number[]; unit: Unit }) {
  if (values.length === 0) return null;
  return (
    <View style={styles.zones}>
      <Text style={styles.zoneEnd}>tip</Text>
      {values.map((v, i) => (
        <Text key={i} style={styles.zone}>
          {fromTenthsF(v, unit).toFixed(0)}°
        </Text>
      ))}
      <Text style={styles.zoneEnd}>handle</Text>
    </View>
  );
}

function clock(sec: number | undefined): string {
  if (sec === undefined) return "0:00:00";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${Math.floor(sec / 3600)}:${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)}`;
}

function title(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff", paddingTop: 56 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRight: { alignItems: "flex-end" },
  title: { fontSize: 24, fontWeight: "600" },
  connection: { fontSize: 15, fontWeight: "500", color: "#1a7f37" },
  warn: { color: "#b35900" },
  muted: { color: "#666" },
  banner: { margin: 16, padding: 12, backgroundColor: "#fdecea", borderRadius: 8, gap: 8 },
  bannerText: { fontSize: 15 },
  cards: { padding: 16, gap: 16 },
  card: { padding: 16, borderRadius: 12, backgroundColor: "#f4f4f4", gap: 8 },
  dim: { opacity: 0.5 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  probeName: { fontSize: 17, fontWeight: "600" },
  docked: { fontSize: 20, color: "#666" },
  core: { fontSize: 56, fontWeight: "300", fontVariant: ["tabular-nums"] },
  detail: { fontSize: 15 },
  zones: { flexDirection: "row", alignItems: "center", gap: 4 },
  zone: {
    flex: 1,
    textAlign: "center",
    paddingVertical: 6,
    backgroundColor: "#e4e4e4",
    borderRadius: 4,
    fontVariant: ["tabular-nums"],
  },
  zoneEnd: { fontSize: 11, color: "#666" },
});
