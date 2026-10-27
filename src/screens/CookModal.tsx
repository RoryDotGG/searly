import { useState } from "react";
import { ActivityIndicator, Button, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { randomId } from "../ble/g1";
import { fromTenthsF, setCook, toTenthsF, type CookingMode, type Probe, type Unit } from "../protocol/messages";
import type { G1 } from "../useG1";
import Segmented from "./Segmented";

// Assumed limits until the official app's are read from the APK (docs/SPEC.md).
const RANGE = { C: [30, 100], F: [86, 212] } as const;
const DEFAULT_TARGET = { C: 60, F: 140 } as const;

const MODES = [
  { value: "manual", label: "Manual" },
  { value: "smart", label: "Smart" },
] as const;

/** Start a cook, start a new one, or change the running cook's target. */
export default function CookModal(props: { g1: G1; probe: Probe; unit: Unit; onClose: () => void }) {
  const { g1, probe, unit } = props;
  const running = probe.cookingState === "cooking" && probe.cookUuid ? probe : null;
  const [mode, setMode] = useState<CookingMode>(running?.cookingMode === "smart" ? "smart" : "manual");
  const [target, setTarget] = useState(() => initialTarget(probe, unit));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Same mode keeps the running cook (timer keeps counting); a new mode replaces it [HW].
  const sameCook = running !== null && running.cookingMode === mode;
  const action = sameCook ? "Change target" : running ? "Start new cook" : "Start cook";
  const [min, max] = RANGE[unit];

  async function apply() {
    const keep = sameCook ? running : null;
    const cookUuid = keep?.cookUuid ?? randomId();
    // A cook started on the G1 itself may not report startClient.
    const startClient = keep ? (keep.startClient ?? "device") : "android";
    const targetTenthsF = toTenthsF(target, unit);
    setBusy(true);
    setError(null);
    try {
      await g1.send(
        "WT10:cooking:action",
        setCook({ probeColor: probe.probeColor, mode, targetTenthsF, cookUuid, startClient }),
        (r) =>
          r.probes.some(
            (p) =>
              p.probeColor === probe.probeColor &&
              p.cookUuid === cookUuid &&
              p.cookingMode === mode &&
              p.setParams[0]?.setTemperature === targetTenthsF,
          ),
      );
      props.onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const step = (by: number) => setTarget((t) => Math.min(max, Math.max(min, t + by)));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={props.onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{action}</Text>
          <Segmented options={MODES} value={mode} onChange={setMode} disabled={busy} />
          <Text style={styles.hint}>
            {mode === "smart"
              ? "Set the eating temperature. The G1 tells you when to take the food off the heat, then when it has rested."
              : "The G1 alerts you when the core reaches the target."}
          </Text>
          <View style={styles.stepper}>
            {[-5, -1].map((by) => (
              <StepButton key={by} by={by} onPress={() => step(by)} disabled={busy || target <= min} />
            ))}
            <Text style={styles.target}>
              {target}°{unit}
            </Text>
            {[1, 5].map((by) => (
              <StepButton key={by} by={by} onPress={() => step(by)} disabled={busy || target >= max} />
            ))}
          </View>
          {running && !sameCook ? (
            <Text style={styles.hint}>This replaces the running cook and restarts its timer.</Text>
          ) : null}
          {running ? <Text style={styles.hint}>To end a cook, put the probe back in the dock.</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.buttons}>
            <Button title="Cancel" onPress={props.onClose} disabled={busy} color="#666" />
            {busy ? <ActivityIndicator /> : <Button title={action} onPress={() => void apply()} />}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function StepButton(props: { by: number; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${props.by > 0 ? "Raise" : "Lower"} target by ${Math.abs(props.by)}`}
      onPress={props.onPress}
      disabled={props.disabled}
      style={[styles.step, props.disabled && styles.stepDisabled]}
    >
      <Text style={styles.stepLabel}>{props.by > 0 ? `+${props.by}` : props.by}</Text>
    </Pressable>
  );
}

function initialTarget(probe: Probe, unit: Unit): number {
  const t = probe.setParams[0]?.setTemperature;
  const [min, max] = RANGE[unit];
  const v = t === undefined ? DEFAULT_TARGET[unit] : Math.round(fromTenthsF(t, unit));
  return Math.min(max, Math.max(min, v));
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", padding: 24, paddingBottom: 40, gap: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  title: { fontSize: 22, fontWeight: "600" },
  hint: { fontSize: 14, color: "#666" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  step: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8, backgroundColor: "#e4e4e4" },
  stepDisabled: { opacity: 0.4 },
  stepLabel: { fontSize: 17, fontVariant: ["tabular-nums"] },
  target: { flex: 1, textAlign: "center", fontSize: 40, fontWeight: "300", fontVariant: ["tabular-nums"] },
  error: { fontSize: 15, color: "#b3261e" },
  buttons: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
