import { useState } from "react";
import { Alert, Button, Modal, StyleSheet, Text, View } from "react-native";

import type { Unit, Volume } from "../protocol/messages";
import type { G1 } from "../useG1";
import Segmented from "./Segmented";

const UNITS = [
  { value: "C", label: "°C" },
  { value: "F", label: "°F" },
] as const;

const VOLUMES = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "quiet", label: "Quiet" },
  { value: "mute", label: "Mute" },
] as const;

export default function SettingsModal(props: {
  g1: G1;
  unit: Unit;
  onUnit: (unit: Unit) => void;
  onClose: () => void;
}) {
  const { g1 } = props;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const live = g1.phase.kind === "live";

  async function setVolume(volume: Volume) {
    setBusy(true);
    setError(null);
    try {
      await g1.send("WT10:setting:modify", { volume }, (r) => r.volume === volume);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function forget() {
    Alert.alert(
      "Forget this G1?",
      "Searly deletes its pairing. The G1 keeps it until you pair again from here or another app.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Forget",
          style: "destructive",
          onPress: () => {
            props.onClose();
            g1.forget();
          },
        },
      ],
    );
  }

  return (
    <Modal visible animationType="slide" onRequestClose={props.onClose}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Button title="Done" onPress={props.onClose} />
        </View>

        <Text style={styles.label}>Temperature unit</Text>
        <Segmented options={UNITS} value={props.unit} onChange={props.onUnit} />
        <Text style={styles.hint}>Only changes this app. The G1's own screen keeps its unit.</Text>

        <Text style={styles.label}>G1 volume</Text>
        <Segmented
          options={VOLUMES}
          value={g1.report?.volume}
          onChange={(v) => void setVolume(v)}
          disabled={busy || !live}
        />
        {!live ? <Text style={styles.hint}>Connect to the G1 to change its volume.</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.spacer} />
        <Button title="Forget this G1" color="#b3261e" onPress={forget} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff", paddingTop: 56, paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "600" },
  label: { fontSize: 15, fontWeight: "600", marginTop: 12 },
  hint: { fontSize: 13, color: "#666" },
  error: { fontSize: 15, color: "#b3261e" },
  spacer: { flex: 1 },
});
