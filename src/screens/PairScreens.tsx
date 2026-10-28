// Welcome, then pairing steps 1 and 2, then Paired.
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";

import { allDocked, type Advert } from "../protocol/advert";
import type { PairFailure } from "../useG1";
import { Button, Centered, IconButton, Spinner } from "../ui/controls";
import DeviceG1 from "../ui/DeviceG1";
import HeatDial from "../ui/HeatDial";
import Icon, { type IconName } from "../ui/Icon";
import { Callout, Caption, Disc, InlineNote, ListGroup, ListRow, Screen, Well, Wordmark } from "../ui/layout";
import { Radar } from "./RecoveryScreens";
import { useNow } from "../ui/motion";
import { Notice } from "../ui/status";
import { font, radius, space, type, useTheme } from "../ui/theme";

const PAIR_TIMEOUT_S = 35; // the G1's own timeout for the OK key

function Fact(props: { icon: IconName; children: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Icon name={props.icon} size={22} color={t.inkMuted} />
      <Text style={{ fontFamily: font.sans500, fontSize: 15, lineHeight: 20, color: t.ink }}>{props.children}</Text>
    </View>
  );
}

/** A headline, three facts, then one action. */
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
      <Text style={[type.titleLg, { color: t.ink }]}>{"Read your G1 from across the room"}</Text>
      <Text style={[type.bodyLg, { color: t.inkMuted }]}>
        Searly talks to your ThermoMaven G1 directly over Bluetooth. It needs no account and collects no data.
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
 * happens. A failed attempt replaces the warning with the reason. While on screen it watches the
 * G1's adverts, so it says live whether the probe is docked and holds Start until it is. Without
 * an advert (no permission yet, Bluetooth off, out of range) it just gives the instruction.
 */
export function Dock(props: {
  failure: PairFailure | null;
  advert: Advert | null;
  onWatch: () => () => void;
  onStart: () => void;
  onCancel: () => void;
  onDebug: () => void;
}) {
  const t = useTheme();
  useEffect(() => props.onWatch(), []);
  const a = props.advert;
  const state = !a ? null : a.pairing ? "busy" : allDocked(a) ? "docked" : "out";
  return (
    <Screen
      title="Pair a G1"
      subtitle="Step 1 of 2"
      onTitleLongPress={props.onDebug}
      actions={<IconButton icon="close" label="Cancel pairing" onPress={props.onCancel} />}
      footer={
        <Button size="lg" block disabled={state === "out" || state === "busy"} onPress={props.onStart}>
          Start pairing
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
      <View accessibilityLiveRegion="polite" style={{ gap: space[4] }}>
        <Text accessibilityRole="header" style={[type.title, { color: t.ink }]}>
          {state === "docked" ? "Probe docked" : "Put the probe in the dock"}
        </Text>
        <Text style={[type.body, { color: t.inkMuted }]}>
          {state === "docked"
            ? "Your G1 says the probe is in its dock. Start pairing when you’re ready."
            : "Slide the probe into the G1 until it sits flush. The G1’s screen shows OFF while it’s docked."}
        </Text>
        {state === "out" || state === "busy" ? (
          <InlineNote lead={<Icon name="alert" size={16} color={t.warn} />}>
            {state === "out" ? "The probe is out of the dock" : "Another phone is pairing with this G1"}
          </InlineNote>
        ) : null}
      </View>
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

/** Between steps 1 and 2: Searly scans for the G1, connects and asks it to trust this phone. */
export function PairSearching(props: { found: string | null; onCancel: () => void; onDebug: () => void }) {
  const t = useTheme();
  return (
    <Screen
      title="Pair a G1"
      subtitle="Step 1 of 2"
      onTitleLongPress={props.onDebug}
      actions={<IconButton icon="close" label="Cancel pairing" onPress={props.onCancel} />}
      footer={
        <Button size="lg" block variant="secondary" onPress={props.onCancel}>
          Cancel
        </Button>
      }
    >
      <Centered>
        <Radar />
        <Text accessibilityRole="header" style={[type.title, { color: t.ink, textAlign: "center" }]}>
          {props.found ? "Connecting to your G1" : "Looking for your G1"}
        </Text>
        <Text style={[type.bodyLg, { color: t.inkMuted, textAlign: "center" }]}>
          {props.found
            ? "Asking it to trust this phone. Its Bluetooth symbol starts flashing in a moment."
            : "Keep it switched on and within a few metres of this phone."}
        </Text>
        <Caption>{props.found ? `Found ${props.found}.` : "Looking now."}</Caption>
      </Centered>
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
