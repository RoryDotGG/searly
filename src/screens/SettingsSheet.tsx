// Settings: the G1's volume (confirmed by the G1), units (this app only), and forgetting the G1.
import { useState } from "react";
import { Text, View } from "react-native";

import type { Unit, Volume } from "../protocol/messages";
import type { G1 } from "../useG1";
import { Button, SegmentedControl, Spinner } from "../ui/controls";
import Icon from "../ui/Icon";
import { Disc, InlineNote, ListGroup, ListRow, Sheet } from "../ui/layout";
import { font, type, useTheme } from "../ui/theme";

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

type VolumeStage = "sending" | "acknowledged" | "failed" | null;

/** The one destructive action explains what it costs before it happens. */
function ForgetConfirm() {
  const t = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 12, paddingTop: 12 }}>
      <Disc tone="danger" icon="unlink" />
      <Text accessibilityRole="header" style={[type.title, { color: t.ink, textAlign: "center" }]}>
        Forget this G1?
      </Text>
      <Text style={[type.body, { color: t.inkMuted, textAlign: "center" }]}>
        Searly deletes the pairing from this phone. To use this G1 again you pair it again, with the probe docked and OK pressed.
      </Text>
    </View>
  );
}

function forgetFooter(onForget: () => void, onKeep: () => void) {
  return (
    <>
      <Button size="lg" block variant="danger" icon="unlink" onPress={onForget}>
        Forget G1
      </Button>
      <Button size="lg" block variant="secondary" onPress={onKeep}>
        Keep it
      </Button>
    </>
  );
}

/** The forget confirmation on its own, for the Not recognised screen. Mounted while open. */
export function ForgetSheet(props: { g1: G1; onDismissed: () => void }) {
  const [visible, setVisible] = useState(true);
  const [forget, setForget] = useState(false);
  return (
    <Sheet
      visible={visible}
      onClose={false}
      onBack={() => setVisible(false)}
      onDismissed={() => {
        props.onDismissed();
        if (forget) props.g1.forget();
      }}
      footer={forgetFooter(
        () => {
          setForget(true);
          setVisible(false);
        },
        () => setVisible(false),
      )}
    >
      <ForgetConfirm />
    </Sheet>
  );
}

/** Mounted while open; `onDismissed` runs once the sheet has slid away. */
export default function SettingsSheet(props: { g1: G1; unit: Unit; onUnit: (unit: Unit) => void; onDismissed: () => void }) {
  const { g1 } = props;
  const t = useTheme();
  const [visible, setVisible] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [forget, setForget] = useState(false);
  const [pending, setPending] = useState<Volume | null>(null);
  const [stage, setStage] = useState<VolumeStage>(null);
  const live = g1.phase.kind === "live" && !g1.stale;
  const busy = stage === "sending" || stage === "acknowledged";

  async function setVolume(volume: Volume) {
    if (busy || volume === g1.report?.volume) return;
    setPending(volume);
    setStage("sending");
    try {
      await g1.send("WT10:setting:modify", { volume }, (r) => r.volume === volume, () => setStage("acknowledged"));
      setStage(null);
    } catch {
      setStage("failed");
    } finally {
      setPending(null);
    }
  }

  const note = !live ? (
    <InlineNote lead={<Icon name="info" size={18} color={t.inkFaint} />}>Connect to the G1 to change its volume.</InlineNote>
  ) : stage === "sending" ? (
    <InlineNote lead={<Spinner color={t.signal} size={14} />}>Sending to the G1</InlineNote>
  ) : stage === "acknowledged" ? (
    <InlineNote lead={<Spinner color={t.signal} size={14} />}>G1 acknowledged, checking it applied</InlineNote>
  ) : stage === "failed" ? (
    <InlineNote lead={<Icon name="alert" size={18} color={t.danger} />} color={t.danger}>
      Not applied. The G1 keeps its last volume.
    </InlineNote>
  ) : (
    <InlineNote lead={<Icon name="check-circle" size={18} color={t.signal} />}>Applied on the G1</InlineNote>
  );

  const close = () => setVisible(false);
  return (
    <Sheet
      visible={visible}
      onClose={confirm ? false : close}
      onBack={confirm ? () => setConfirm(false) : close}
      onDismissed={() => {
        props.onDismissed();
        if (forget) g1.forget();
      }}
      {...(confirm
        ? {
            footer: forgetFooter(
              () => {
                setForget(true);
                close();
              },
              () => setConfirm(false),
            ),
          }
        : {
            title: "Settings",
            subtitle: g1.name ? <Text style={{ fontFamily: font.mono400, fontSize: 12, lineHeight: 18, color: t.inkMuted }}>{g1.name}</Text> : undefined,
          })}
    >
      {confirm ? (
        <ForgetConfirm />
      ) : (
        <>
          <ListGroup title="G1 volume">
            <View style={{ padding: 6 }}>
              <SegmentedControl
                label="G1 volume"
                options={VOLUMES}
                value={pending ?? g1.report?.volume}
                onChange={(v) => void setVolume(v)}
                disabled={!live || busy}
              />
            </View>
            <View style={{ paddingTop: 2, paddingHorizontal: 16, paddingBottom: 12 }}>{note}</View>
          </ListGroup>
          <ListGroup title="Units in Searly" footnote="The G1’s own screen keeps its unit.">
            <View style={{ padding: 6 }}>
              <SegmentedControl label="Units" options={UNITS} value={props.unit} onChange={props.onUnit} />
            </View>
          </ListGroup>
          <ListGroup
            title="This G1"
            footnote="For hardware testing, long-press the G1’s name on the live screen to open the debug log."
          >
            <ListRow
              icon="unlink"
              title="Forget this G1"
              subtitle="Deletes the pairing from this phone"
              tone="danger"
              chevron
              onPress={() => setConfirm(true)}
            />
          </ListGroup>
        </>
      )}
    </Sheet>
  );
}
