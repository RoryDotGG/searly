import { useState } from "react";
import { ActivityIndicator, Button, Pressable, StyleSheet, Text, View } from "react-native";

import type { G1 } from "../useG1";
import DebugLog from "./DebugLog";

export default function PairScreen({ g1 }: { g1: G1 }) {
  const [showLog, setShowLog] = useState(false);
  const { phase } = g1;

  let status = "Put the probe in the dock, then tap Pair.";
  let action: { title: string; onPress: () => void } | null = { title: "Pair", onPress: g1.pair };
  if (phase.kind === "pairing") {
    status = phase.pressOk ? "Press OK on the G1." : "Looking for the G1…";
    action = null;
  } else if (phase.kind === "needs-repair") {
    status = "This G1 no longer accepts this phone. Another app may have paired with it.";
    action = { title: "Pair again", onPress: g1.pair };
  } else if (phase.kind === "error") {
    status = phase.reason;
    action = { title: phase.fix === "settings" ? "Open settings" : "Try again", onPress: g1.retry };
  }

  return (
    <View style={styles.screen}>
      <Pressable onLongPress={() => setShowLog(true)}>
        <Text style={styles.title}>Pair your G1</Text>
      </Pressable>
      <Text style={styles.body}>
        1. Put the probe in the dock.{"\n"}2. Tap Pair.{"\n"}3. Press OK on the G1 when its Bluetooth icon
        flashes.
      </Text>
      <Text style={styles.note}>
        Pairing makes this phone the G1's owner. The ThermoMaven app, or any other client, stops working
        with it until you pair that again.
      </Text>
      <Text style={styles.status}>{status}</Text>
      {action ? <Button title={action.title} onPress={action.onPress} /> : <ActivityIndicator size="large" />}
      <DebugLog g1={g1} visible={showLog} onClose={() => setShowLog(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff", paddingTop: 72, paddingHorizontal: 24, gap: 20 },
  title: { fontSize: 28, fontWeight: "600" },
  body: { fontSize: 17, lineHeight: 26 },
  note: { fontSize: 14, color: "#666" },
  status: { fontSize: 18, fontWeight: "500", marginTop: 12 },
});
