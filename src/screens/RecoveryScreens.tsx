// Full-screen states for when Searly cannot reach the G1: each says what happens next.
import type { ReactNode } from "react";
import { Animated, Text, View } from "react-native";

import { Button, Centered } from "../ui/controls";
import { Caption, Disc, Screen } from "../ui/layout";
import { useLoop } from "../ui/motion";
import { RetrySchedule } from "../ui/status";
import { font, type, useTheme } from "../ui/theme";

/** The shared header: the G1's name (or the pairing title), the connection pill and settings. */
export interface Bar {
  title: string;
  subtitle?: string | undefined;
  actions: ReactNode;
  onTitleLongPress: () => void;
}

function Title(props: { children: string }) {
  const t = useTheme();
  return (
    <Text accessibilityRole="header" style={[type.title, { color: t.ink, textAlign: "center" }]}>
      {props.children}
    </Text>
  );
}

function Lead(props: { children: string }) {
  const t = useTheme();
  return <Text style={[type.bodyLg, { color: t.inkMuted, textAlign: "center" }]}>{props.children}</Text>;
}

/** One button. When Bluetooth returns, Searly carries on by itself. */
export function BluetoothOff(props: { bar: Bar; paired: boolean; onTurnOn: () => void }) {
  return (
    <Screen
      {...props.bar}
      footer={
        <>
          <Button size="lg" block icon="bluetooth" onPress={props.onTurnOn}>
            Turn on Bluetooth
          </Button>
          <Caption>Or switch it on from quick settings.</Caption>
        </>
      }
    >
      <Centered>
        <Disc tone="warn" icon="bluetooth-off" />
        <Title>Bluetooth is off</Title>
        <Lead>
          {props.paired
            ? "Turn it on and Searly reconnects to your G1 by itself."
            : "Turn it on and Searly picks up the pairing where you left it."}
        </Lead>
      </Centered>
    </Screen>
  );
}

function Step(props: { n: number; children: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: t.surfaceRaised,
          boxShadow: `inset 0 0 0 1px ${t.line}`,
        }}
      >
        <Text style={{ fontFamily: font.sans650, fontSize: 13, color: t.inkMuted, includeFontPadding: false }}>{props.n}</Text>
      </View>
      <Text style={{ fontFamily: font.sans500, fontSize: 15, lineHeight: 20, color: t.ink }}>{props.children}</Text>
    </View>
  );
}

/**
 * The exact path in Settings, and a promise it recovers without a restart. If Android can still
 * ask, the button asks again instead.
 */
export function Permission(props: { bar: Bar; settings: boolean; onFix: () => void }) {
  return (
    <Screen
      {...props.bar}
      footer={
        props.settings ? (
          <>
            <Button size="lg" block onPress={props.onFix}>
              Open Settings
            </Button>
            <Caption>Come back afterwards. Searly picks up by itself.</Caption>
          </>
        ) : (
          <Button size="lg" block onPress={props.onFix}>
            Allow Nearby devices
          </Button>
        )
      }
    >
      <Centered>
        <Disc tone="info" icon="lock" />
        <Title>Allow Nearby devices</Title>
        <Lead>Searly needs this to find and talk to your G1. It never uses your location.</Lead>
        {props.settings ? (
          <View style={{ alignSelf: "stretch", gap: 10, marginTop: 12 }}>
            <Step n={1}>Open Settings</Step>
            <Step n={2}>Permissions</Step>
            <Step n={3}>Nearby devices, then Allow</Step>
          </View>
        ) : null}
      </Centered>
    </Screen>
  );
}

function RadarRing(props: { delay: number }) {
  const t = useTheme();
  const v = useLoop(3000, true, props.delay);
  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 1.5,
        borderColor: t.signal,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) }],
      }}
    />
  );
}

/** Rings spreading from a Bluetooth disc: Searly is looking for the G1. */
export function Radar() {
  return (
    <View style={{ width: 200, height: 200, alignItems: "center", justifyContent: "center" }}>
      <RadarRing delay={0} />
      <RadarRing delay={1000} />
      <RadarRing delay={2000} />
      <Disc tone="signal" icon="bluetooth" size={72} ring={false} />
    </View>
  );
}

/**
 * Searching, connecting or retrying with no reading yet, with the retry schedule on screen.
 * `attempt` counts retries (0 is the first try); `nextIn` is set while waiting for one.
 */
export function Searching(props: {
  bar: Bar;
  connecting: boolean;
  attempt: number;
  nextIn: number | null;
  onTryNow: () => void;
}) {
  const caption = props.connecting
    ? "Found it. Connecting."
    : props.attempt === 0
      ? "Looking now."
      : props.nextIn === null
        ? `Attempt ${props.attempt}. Looking now.`
        : `Attempt ${props.attempt}. Next try in ${props.nextIn} s.`;
  return (
    <Screen
      {...props.bar}
      footer={
        <Button size="lg" block variant="secondary" icon="refresh" onPress={props.onTryNow}>
          Try now
        </Button>
      }
    >
      <Centered>
        <Radar />
        <Title>{props.connecting ? "Connecting to your G1" : "Looking for your G1"}</Title>
        <Lead>Keep it switched on and within a few metres of this phone.</Lead>
        <View style={{ alignSelf: "stretch", marginTop: 16 }}>
          <RetrySchedule attempt={Math.min(5, Math.max(0, props.attempt - 1))} />
        </View>
        <Caption>{caption}</Caption>
      </Centered>
    </Screen>
  );
}

/** The pairing is kept until you choose: pair again, or forget. */
export function NotRecognised(props: { bar: Bar; onPairAgain: () => void; onForget: () => void }) {
  return (
    <Screen
      {...props.bar}
      footer={
        <>
          <Button size="lg" block onPress={props.onPairAgain}>
            Pair again
          </Button>
          <Button block variant="quiet" onPress={props.onForget}>
            Forget this G1
          </Button>
        </>
      }
    >
      <Centered>
        <Disc tone="danger" icon="unlink" />
        <Title>The G1 doesn’t recognise this phone</Title>
        <Lead>It may have been paired with another phone or app since. Pair again with the probe docked.</Lead>
      </Centered>
    </Screen>
  );
}

/** The phone's secure storage did not answer when Searly read the pairing. */
export function StorageError(props: { bar: Bar; onRetry: () => void }) {
  return (
    <Screen
      {...props.bar}
      footer={
        <Button size="lg" block icon="refresh" onPress={props.onRetry}>
          Try again
        </Button>
      }
    >
      <Centered>
        <Disc tone="danger" icon="alert" />
        <Title>Searly couldn’t read the pairing</Title>
        <Lead>This phone’s secure storage didn’t answer. Trying again usually works.</Lead>
      </Centered>
    </Screen>
  );
}
