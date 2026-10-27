// Welcome, then pairing steps 1 and 2, then Paired.
import { Pressable, Text, View } from "react-native";

import type { PairFailure } from "../useG1";
import { Button, Centered, IconButton, Spinner } from "../ui/controls";
import DeviceG1 from "../ui/DeviceG1";
import HeatDial from "../ui/HeatDial";
import Icon, { type IconName } from "../ui/Icon";
import { Callout, Caption, Disc, InlineNote, ListGroup, ListRow, Screen, Well, Wordmark } from "../ui/layout";
import { useNow } from "../ui/motion";
import { Notice } from "../ui/status";
import { font, radius, type, useTheme } from "../ui/theme";

const PAIR_TIMEOUT_S = 35; // the G1's own timeout for the OK key

function Fact(props: { icon: IconName; children: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Icon name={props.icon} size={22} color={t.searText} />
      <Text style={{ fontFamily: font.sans500, fontSize: 15, lineHeight: 20, color: t.ink }}>{props.children}</Text>
    </View>
  );
}

/** The promise in three lines, then one action. */
export function Welcome(props: { onPair: () => void; onDebug: () => void }) {
  const t = useTheme();
  return (
    <Screen
      footer={
        <>
          <Button size="lg" block iconRight="chevron-right" onPress={props.onPair}>
            Pair a G1
          </Button>
          <Caption>Free and open source. MIT licence.</Caption>
        </>
      }
    >
      <Pressable onLongPress={props.onDebug} delayLongPress={600} style={{ paddingTop: 12, alignSelf: "flex-start" }}>
        <Wordmark size={26} />
      </Pressable>
      <View style={{ marginTop: 4, marginBottom: -8 }}>
        <HeatDial core={57.6} target={65} start={5} unit="C" state="cooking" size={236} />
      </View>
      <Text style={[type.titleLg, { color: t.ink }]}>{"Your G1.\nYour phone.\nNothing between."}</Text>
      <Text style={[type.bodyLg, { color: t.inkMuted }]}>
        Searly talks to your ThermoMaven G1 over Bluetooth. No account, no cloud, no tracking.
      </Text>
      <View style={{ gap: 12 }}>
        <Fact icon="cloud-off">Works with no internet at all</Fact>
        <Fact icon="lock">The pairing stays on this phone</Fact>
        <Fact icon="bluetooth">Reconnects by itself</Fact>
      </View>
    </Screen>
  );
}

const FAILURE: Record<PairFailure, string> = {
  declined: "The G1 declined, timed out, or the probe wasn’t in the dock. Nothing was saved.",
  "not-found": "Searly couldn’t find a G1. Check it’s switched on and within a few metres of this phone.",
  "no-reply": "No reply from the G1. Nothing was saved.",
};

/**
 * Step 1: the drawn G1 shows what to look for, and the ownership warning comes before anything
 * happens. While Searly looks for the G1 the button spins; a failed attempt replaces the warning.
 */
export function Dock(props: {
  searching: boolean;
  failure: PairFailure | null;
  onStart: () => void;
  onCancel: () => void;
  onDebug: () => void;
}) {
  const t = useTheme();
  return (
    <Screen
      title="Pair a G1"
      subtitle="Step 1 of 2"
      onTitleLongPress={props.onDebug}
      actions={<IconButton icon="close" label="Cancel pairing" onPress={props.onCancel} />}
      footer={
        <Button size="lg" block loading={props.searching} onPress={props.onStart}>
          {props.searching ? "Finding your G1" : "Start pairing"}
        </Button>
      }
    >
      <Well height={272} style={{ paddingTop: 10, paddingLeft: 36 }}>
        <DeviceG1 width={168} crop={250} highlight="probe" />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 56,
            backgroundImage: `linear-gradient(180deg, transparent, ${t.surface})`,
          }}
        />
        <Callout left={190} top={35}>
          Probe in the dock
        </Callout>
        <Callout left={184} top={132}>
          Screen shows OFF
        </Callout>
      </Well>
      <Text accessibilityRole="header" style={[type.title, { color: t.ink }]}>
        Put the probe in the dock
      </Text>
      <Text style={[type.body, { color: t.inkMuted }]}>
        Slide the probe into the G1 until it sits flush. The G1’s screen shows OFF while it’s docked.
      </Text>
      {props.failure ? (
        <Notice tone="danger" title="Pairing didn’t finish">
          {FAILURE[props.failure]}
        </Notice>
      ) : (
        <Notice tone="warn" title="This phone becomes the owner">
          Any other app paired with this G1, including ThermoMaven’s, will be signed out.
        </Notice>
      )}
    </Screen>
  );
}

/** Step 2: the OK key pulses, and a countdown matches the G1's own 35 s timeout. */
export function PressOk(props: { since: number; onCancel: () => void; onDebug: () => void }) {
  const t = useTheme();
  const now = useNow();
  const left = Math.max(0, PAIR_TIMEOUT_S - Math.floor((now - props.since) / 1000));
  return (
    <Screen
      title="Pair a G1"
      subtitle="Step 2 of 2"
      onTitleLongPress={props.onDebug}
      actions={<IconButton icon="close" label="Cancel pairing" onPress={props.onCancel} />}
      footer={
        <Button size="lg" block variant="secondary" onPress={props.onCancel}>
          Cancel
        </Button>
      }
    >
      <Well height={352} style={{ paddingTop: 4, paddingLeft: 36 }}>
        <DeviceG1 width={176} crop={340} highlight="ok" bluetoothBlink />
        <Callout left={186} top={84}>
          Bluetooth flashes
        </Callout>
        <Callout left={186} top={306}>
          Press OK
        </Callout>
        <View
          accessibilityLabel={`${left} seconds left`}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            height: 32,
            paddingLeft: 10,
            paddingRight: 12,
            borderRadius: radius.pill,
            backgroundColor: t.surfaceRaised,
            boxShadow: `inset 0 0 0 1px ${t.line}`,
          }}
        >
          <Icon name="timer" size={15} color={t.inkMuted} />
          <Text style={{ fontFamily: font.sans600, fontSize: 13, color: t.inkMuted, fontVariant: ["tabular-nums"] }}>{`${left} s`}</Text>
        </View>
      </Well>
      <Text accessibilityRole="header" style={[type.title, { color: t.ink }]}>
        Press OK on the G1
      </Text>
      <Text style={[type.body, { color: t.inkMuted }]}>
        Your G1 is asking whether to trust this phone. Press OK once. The Bluetooth symbol on its screen flashes while it waits.
      </Text>
      <InlineNote lead={<Spinner color={t.signal} size={14} />}>Waiting for the G1</InlineNote>
    </Screen>
  );
}

/** Done. Cyan means the G1 confirmed. */
export function Paired(props: { name: string | null; onContinue: () => void }) {
  const t = useTheme();
  return (
    <Screen
      footer={
        <Button size="lg" block onPress={props.onContinue}>
          Go to live view
        </Button>
      }
    >
      <Centered>
        <Disc tone="signal" icon="check" />
        <Text accessibilityRole="header" style={[type.titleLg, { color: t.ink, textAlign: "center" }]}>
          Paired
        </Text>
        <Text style={[type.bodyLg, { color: t.inkMuted, textAlign: "center" }]}>
          Your G1 trusts this phone. Next time, Searly connects without you touching the G1.
        </Text>
        <View style={{ alignSelf: "stretch", marginTop: 10 }}>
          <ListGroup>
            <ListRow
              icon="bluetooth"
              title={<Text style={{ fontFamily: font.mono400, fontSize: 14, lineHeight: 22, color: t.ink }}>{props.name ?? "G1"}</Text>}
              subtitle="Saved in this phone’s secure storage"
            />
          </ListGroup>
        </View>
      </Centered>
    </Screen>
  );
}
