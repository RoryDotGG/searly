// Hardware-testing log, opened by a long press on a screen title. Never shown to users by default.
import { useRef } from "react";
import { Button, Modal, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from "react-native";

import type { G1 } from "../useG1";

export default function DebugLog({ g1, visible, onClose }: { g1: G1; visible: boolean; onClose: () => void }) {
  const scroll = useRef<ScrollViewInstance>(null);
  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide">
      <View style={styles.screen}>
        <View style={styles.buttons}>
          <Button title="Close" onPress={onClose} />
          {/* Moves to SettingsModal in build step 5. */}
          {g1.paired ? <Button title="Forget this G1" color="#a33" onPress={g1.forget} /> : null}
        </View>
        <ScrollView
          style={styles.log}
          ref={scroll}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
        >
          {g1.log.map((line, i) => (
            <Text key={i} style={styles.mono} selectable>
              {line}
            </Text>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff", paddingTop: 56, paddingHorizontal: 16, gap: 12 },
  buttons: { flexDirection: "row", gap: 12 },
  log: { flex: 1, backgroundColor: "#f4f4f4", padding: 8, marginBottom: 32 },
  mono: { fontFamily: "monospace", fontSize: 12 },
});
