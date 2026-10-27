// Hardware-testing log, opened by a long press on a screen title. Never shown to people who did not
// ask for it. Sent in ember, received in cyan, errors on a danger wash.
import * as Clipboard from "expo-clipboard";
import { useRef, useState } from "react";
import { Modal, ScrollView, Text, View, type ScrollViewInstance } from "react-native";

import type { LogDir } from "../ble/g1";
import type { G1, LogEntry } from "../useG1";
import { IconButton, SegmentedControl } from "../ui/controls";
import { Screen } from "../ui/layout";
import { font, radius, useTheme, type Theme } from "../ui/theme";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "tx", label: "Sent" },
  { value: "rx", label: "Received" },
  { value: "err", label: "Errors" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];

const DIR: Record<LogDir, string> = { tx: "→", rx: "←", sys: "·", err: "!" };
// Message names such as WT10:status:report are bolded.
const NAME = /(\b[A-Za-z0-9]+:[A-Za-z]+:[A-Za-z]+\b)/;

function dirColour(t: Theme, d: LogDir): string {
  return d === "tx" ? t.searText : d === "rx" ? t.signal : d === "err" ? t.danger : t.inkFaint;
}

function Row(props: { e: LogEntry }) {
  const t = useTheme();
  const { e } = props;
  const err = e.dir === "err";
  const mono = { fontFamily: font.mono400, fontSize: 12, lineHeight: 18 } as const;
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 8,
        paddingVertical: 3,
        paddingHorizontal: 12,
        alignItems: "flex-start",
        backgroundColor: err ? t.dangerWash : "transparent",
      }}
    >
      <Text style={[mono, { color: t.inkFaint, fontVariant: ["tabular-nums"] }]}>{e.t}</Text>
      <Text accessibilityLabel={e.dir} style={[mono, { width: 16, textAlign: "center", fontFamily: font.mono600, color: dirColour(t, e.dir) }]}>
        {DIR[e.dir]}
      </Text>
      <Text selectable style={[mono, { flex: 1, color: err ? t.danger : t.inkMuted }]}>
        {e.text.split(NAME).map((s, i) =>
          i % 2 ? (
            <Text key={i} style={{ fontFamily: font.mono600, color: err ? t.danger : t.ink }}>
              {s}
            </Text>
          ) : (
            s
          ),
        )}
      </Text>
    </View>
  );
}

export default function DebugLog(props: { g1: G1; visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const scroll = useRef<ScrollViewInstance>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const entries = filter === "all" ? props.g1.log : props.g1.log.filter((e) => e.dir === filter);
  const copy = () => void Clipboard.setStringAsync(props.g1.log.map((e) => `${e.t} ${e.dir} ${e.text}`).join("\n"));

  return (
    <Modal visible={props.visible} onRequestClose={props.onClose} animationType="slide" statusBarTranslucent navigationBarTranslucent>
      <Screen
        title="Debug log"
        subtitle={`${entries.length} lines, newest last`}
        actions={
          <>
            <IconButton icon="copy" label="Copy log" onPress={copy} />
            <IconButton icon="close" label="Close" onPress={props.onClose} />
          </>
        }
        bodyStyle={{ paddingBottom: 16 }}
      >
        <SegmentedControl label="Filter" options={FILTERS} value={filter} onChange={setFilter} />
        <ScrollView
          ref={scroll}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
          style={{ flex: 1, backgroundColor: t.surfaceSunken, borderRadius: radius.md, boxShadow: `inset 0 0 0 1px ${t.line}` }}
          contentContainerStyle={{ paddingVertical: 8 }}
        >
          {entries.map((e, i) => (
            <Row key={i} e={e} />
          ))}
        </ScrollView>
      </Screen>
    </Modal>
  );
}
