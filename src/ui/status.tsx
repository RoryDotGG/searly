// Connection pill, battery, cook status, notice, apply receipt and retry schedule.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Text, View } from "react-native";

import { Button } from "./controls";
import Icon, { type IconName } from "./Icon";
import { useBlink } from "./motion";
import { font, motion, radius, space, useReducedMotion, useTheme, type Theme } from "./theme";

export type PillState = "live" | "stale" | "reconnecting" | "searching" | "connecting" | "off" | "permission" | "error";

const PILL_TEXT: Record<PillState, string> = {
  live: "Live",
  stale: "No data",
  reconnecting: "Reconnecting",
  searching: "Looking for G1",
  connecting: "Connecting",
  off: "Bluetooth off",
  permission: "Permission needed",
  error: "Not paired",
};

function pillColours(t: Theme, s: PillState): { bg: string; fg: string; shadow?: string } {
  switch (s) {
    case "live":
      return { bg: t.signalWash, fg: t.signal };
    case "stale":
    case "off":
    case "permission":
      return { bg: t.warnWash, fg: t.warn };
    case "error":
      return { bg: t.dangerWash, fg: t.danger };
    default:
      return { bg: t.surfaceRaised, fg: t.inkMuted, shadow: `inset 0 0 0 1px ${t.line}` };
  }
}

/**
 * The header's connection state. `beat` increments on each status report and pulses the dot once.
 * Cyan only for live, amber for anything that needs the person, grey while Searly works on it.
 */
export function ConnectionPill(props: { state: PillState; seconds?: number | undefined; beat?: number }) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const c = pillColours(t, props.state);
  const wait = props.state === "reconnecting" || props.state === "searching" || props.state === "connecting";
  const blink = useBlink(1400, wait);
  const ring = useRef(new Animated.Value(1)).current;
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (props.beat === undefined || props.beat === 0 || props.state !== "live") return;
    if (reduced) {
      // The heartbeat is a colour change only.
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 300);
      return () => clearTimeout(id);
    }
    ring.setValue(0);
    Animated.timing(ring, { toValue: 1, duration: 1200, easing: motion.easeOut, useNativeDriver: true }).start();
  }, [props.beat, props.state, reduced, ring]);

  let text = PILL_TEXT[props.state];
  if (props.state === "stale" && props.seconds !== undefined) text = `No data for ${props.seconds} s`;
  if (props.state === "reconnecting" && props.seconds !== undefined) text = `Retry in ${props.seconds} s`;

  return (
    <View
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        height: 32,
        paddingLeft: 10,
        paddingRight: 12,
        borderRadius: radius.pill,
        backgroundColor: c.bg,
        boxShadow: c.shadow,
      }}
    >
      {props.state === "off" ? (
        <Icon name="bluetooth-off" size={16} color={c.fg} />
      ) : (
        <Animated.View style={{ width: 8, height: 8, opacity: blink }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: flash ? t.ink : c.fg }} />
          {props.state === "live" ? (
            <Animated.View
              style={{
                position: "absolute",
                top: -4,
                left: -4,
                width: 16,
                height: 16,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: c.fg,
                opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
                transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.2] }) }],
              }}
            />
          ) : null}
        </Animated.View>
      )}
      <Text style={{ fontFamily: font.sans600, fontSize: 13, color: c.fg, fontVariant: ["tabular-nums"], includeFontPadding: false }}>
        {text}
      </Text>
    </View>
  );
}

/**
 * A four-bar battery glyph like the G1's. 20% or less turns amber. Charging bars are cyan and the
 * next bar blinks. With no level (a docked probe does not report one) it says Charging, with no icon.
 */
export function Battery(props: { label: string; level: number | undefined; charging?: boolean }) {
  const t = useTheme();
  const lvl = props.level === undefined ? undefined : Math.min(100, Math.max(0, props.level));
  const on = lvl === undefined ? 0 : Math.ceil(lvl / 25);
  const low = lvl !== undefined && lvl <= 20 && !props.charging;
  const blink = useBlink(1600, !!props.charging);
  const barColour = props.charging ? t.signal : low ? t.warn : t.ink;
  const label =
    lvl === undefined
      ? `${props.label} charging`
      : `${props.label} battery ${lvl}%${props.charging ? ", charging" : ""}`;
  return (
    <View accessible accessibilityLabel={label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text style={{ fontFamily: font.sans500, fontSize: 12, lineHeight: 16, color: t.inkMuted }}>{props.label}</Text>
      {lvl === undefined ? null : (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 2,
            padding: 2,
            borderRadius: 4,
            boxShadow: `inset 0 0 0 1.5px ${t.inkMuted}`,
          }}
        >
          {[0, 1, 2, 3].map((i) => {
            const lit = i < on;
            const next = !!props.charging && i === on;
            const bar = (
              <View
                key={i}
                style={{
                  width: 4,
                  height: 12,
                  borderRadius: 1.5,
                  backgroundColor: lit || next ? barColour : t.ink,
                  opacity: lit ? 1 : next ? undefined : 0.14,
                }}
              />
            );
            return next ? (
              <Animated.View key={i} style={{ opacity: blink }}>
                {bar}
              </Animated.View>
            ) : (
              bar
            );
          })}
          <View
            style={{
              position: "absolute",
              right: -4,
              top: 5,
              width: 2,
              height: 6,
              borderTopRightRadius: 2,
              borderBottomRightRadius: 2,
              backgroundColor: t.inkMuted,
            }}
          />
        </View>
      )}
      {lvl === undefined ? null : (
        <Text style={{ fontFamily: font.sans600, fontSize: 12, lineHeight: 16, color: t.ink, fontVariant: ["tabular-nums"] }}>
          {lvl}%
        </Text>
      )}
      {props.charging && lvl !== undefined ? <Icon name="bolt" size={14} color={t.inkMuted} /> : null}
      {lvl === undefined ? (
        <Text style={{ fontFamily: font.sans500, fontSize: 12, lineHeight: 16, color: t.inkMuted }}>Charging</Text>
      ) : null}
    </View>
  );
}

export function clock(sec: number | undefined): string {
  const s = Math.max(0, Math.floor(sec ?? 0));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

/** Ticks locally every second between reports, then resyncs to curCookSec. */
export function useElapsed(elapsed: number | undefined, running: boolean): number {
  const [now, setNow] = useState(elapsed ?? 0);
  useEffect(() => setNow(elapsed ?? 0), [elapsed]);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [running, elapsed]);
  return now;
}

function Chip(props: { tone: "plain" | "sear" | "signal"; icon?: IconName; children: string }) {
  const t = useTheme();
  const c =
    props.tone === "sear"
      ? { bg: t.searWash, fg: t.searText }
      : props.tone === "signal"
        ? { bg: t.signalWash, fg: t.signal }
        : { bg: t.surfaceRaised, fg: t.inkMuted, shadow: `inset 0 0 0 1px ${t.line}` };
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 32,
        paddingHorizontal: space[3],
        borderRadius: radius.pill,
        backgroundColor: c.bg,
        boxShadow: "shadow" in c ? c.shadow : undefined,
      }}
    >
      {props.icon ? <Icon name={props.icon} size={15} color={c.fg} /> : null}
      <Text style={{ fontFamily: font.sans600, fontSize: 13, color: c.fg, includeFontPadding: false }}>{props.children}</Text>
    </View>
  );
}

/**
 * The cook state chip and elapsed timer above the dial. Docked shows no chip: the dial already says
 * Docked. The row keeps its height either way, so the dial never moves.
 */
export function CookStatus(props: {
  state: "cooking" | "done" | "docked" | "idle";
  mode?: "manual" | "smart";
  elapsed?: number | undefined;
  running?: boolean;
}) {
  const t = useTheme();
  const mode = props.mode === "smart" ? "Smart" : "Manual";
  const timed = props.state === "cooking" || props.state === "done";
  const sec = useElapsed(props.elapsed, timed && !!props.running);
  return (
    <View
      style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: space[3], minHeight: 32 }}
    >
      {props.state === "docked" ? null : props.state === "idle" ? (
        <Chip tone="plain">Ready to cook</Chip>
      ) : props.state === "done" ? (
        <Chip tone="signal" icon="check">{`${mode} · At target`}</Chip>
      ) : (
        <Chip tone="sear">{`${mode} · Cooking`}</Chip>
      )}
      {timed ? (
        <View accessible accessibilityLabel={`Elapsed ${clock(sec)}`} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="timer" size={16} color={t.inkFaint} />
          <Text
            style={{
              fontFamily: font.display,
              fontSize: 15,
              letterSpacing: 0.15,
              color: t.ink,
              fontVariant: ["tabular-nums"],
              includeFontPadding: false,
            }}
          >
            {clock(sec)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export type Tone = "info" | "warn" | "danger" | "signal";
const NOTICE_ICON: Record<Tone, IconName> = { info: "info", warn: "alert", danger: "alert", signal: "check" };

/**
 * A tinted message with an icon disc. The title says what is true; the body says what happens
 * next. At most one per screen. Never a coloured left border.
 */
export function Notice(props: { tone?: Tone; title?: string; children?: ReactNode; icon?: IconName }) {
  const t = useTheme();
  const tone = props.tone ?? "info";
  const c = {
    info: { bg: t.surface, disc: t.surfaceRaised, fg: t.inkMuted, shadow: `inset 0 0 0 1px ${t.line}` },
    warn: { bg: t.warnWash, disc: t.warn, fg: t.onWarn, shadow: undefined },
    danger: { bg: t.dangerWash, disc: t.danger, fg: t.onDanger, shadow: undefined },
    signal: { bg: t.signalWash, disc: t.signal, fg: t.onSignal, shadow: undefined },
  }[tone];
  return (
    <View
      accessibilityRole={tone === "warn" || tone === "danger" ? "alert" : "summary"}
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: space[3],
        padding: space[4],
        borderRadius: radius.md,
        backgroundColor: c.bg,
        boxShadow: c.shadow,
      }}
    >
      <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: c.disc }}>
        <Icon name={props.icon ?? NOTICE_ICON[tone]} size={18} strokeWidth={2} color={c.fg} />
      </View>
      <View style={{ flex: 1 }}>
        {props.title ? <Text style={{ fontFamily: font.sans600, fontSize: 15, lineHeight: 22, color: t.ink }}>{props.title}</Text> : null}
        {props.children ? (
          <Text style={{ fontFamily: font.sans400, fontSize: 14, lineHeight: 20, color: t.inkMuted, marginTop: 2 }}>{props.children}</Text>
        ) : null}
      </View>
    </View>
  );
}

export type Stage = "sending" | "acknowledged" | "applied" | "failed";
const STAGES = ["sending", "acknowledged", "applied"] as const;
const STAGE_TITLE: Record<Stage, string> = {
  sending: "Sending to the G1",
  acknowledged: "G1 acknowledged, checking it applied",
  applied: "Applied on the G1",
  failed: "No reply from the G1",
};

/** `done` is the colour of a passed step: grey until the G1's report confirms, then cyan. */
function ReceiptNode(props: { state: "" | "done" | "active" | "fail"; done: string }) {
  const t = useTheme();
  const blink = useBlink(1200, props.state === "active");
  const bg = props.state === "done" ? props.done : props.state === "fail" ? t.danger : "transparent";
  const ring = props.state === "active" ? t.ink : props.state === "" ? t.lineStrong : undefined;
  return (
    <Animated.View
      style={{
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: bg,
        boxShadow: ring ? `inset 0 0 0 2px ${ring}` : undefined,
        opacity: blink,
      }}
    />
  );
}

function ReceiptWire(props: { filled: boolean; colour: string }) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const fill = useRef(new Animated.Value(props.filled ? 1 : 0)).current;
  useEffect(() => {
    const to = props.filled ? 1 : 0;
    if (reduced) return fill.setValue(to);
    Animated.timing(fill, { toValue: to, duration: 420, easing: motion.easeOut, useNativeDriver: false }).start();
  }, [props.filled, reduced, fill]);
  return (
    <View style={{ flex: 1, height: 2, borderRadius: 2, backgroundColor: t.line, overflow: "hidden" }}>
      <Animated.View
        style={{
          height: 2,
          backgroundColor: props.colour,
          width: fill.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
        }}
      />
    </View>
  );
}

/**
 * A command going from sent, to acknowledged by the G1, to applied in its next status report.
 * Only applied turns cyan, and only once a report shows the new value: until then the steps are grey.
 */
export function ApplyReceipt(props: {
  stage: Stage;
  title?: string;
  detail?: string;
  failedAt?: 1 | 2;
  onRetry?: () => void;
}) {
  const t = useTheme();
  const failed = props.stage === "failed";
  const done = props.stage === "applied" ? t.signal : t.inkMuted;
  const at = failed ? (props.failedAt ?? 1) : STAGES.indexOf(props.stage as (typeof STAGES)[number]);
  const node = (i: number) =>
    failed && i === at ? "fail" : i < at || (i === at && props.stage === "applied") ? "done" : i === at ? "active" : "";
  const icon: IconName = failed ? "alert" : props.stage === "applied" ? "check-circle" : "refresh";
  const iconColour = failed ? t.danger : props.stage === "applied" ? t.signal : t.inkMuted;
  const label = (l: string, i: number, align: "left" | "center" | "right") => (
    <Text
      key={l}
      style={{
        flex: 1,
        textAlign: align,
        fontFamily: font.sans500,
        fontSize: 12,
        lineHeight: 16,
        color: i <= at ? t.inkMuted : t.inkFaint,
      }}
    >
      {l}
    </Text>
  );
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        gap: space[3],
        padding: space[4],
        borderRadius: radius.md,
        backgroundColor: t.surface,
        boxShadow: `inset 0 0 0 1px ${t.line}`,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
        <Icon name={icon} size={20} color={iconColour} />
        <Text style={{ flex: 1, fontFamily: font.sans600, fontSize: 15, lineHeight: 20, color: t.ink }}>
          {props.title ?? STAGE_TITLE[props.stage]}
        </Text>
      </View>
      <View importantForAccessibility="no-hide-descendants" style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
        <ReceiptNode state={node(0)} done={done} />
        <ReceiptWire filled={at > 0} colour={done} />
        <ReceiptNode state={node(1)} done={done} />
        <ReceiptWire filled={at > 1} colour={done} />
        <ReceiptNode state={node(2)} done={done} />
      </View>
      <View importantForAccessibility="no-hide-descendants" style={{ flexDirection: "row" }}>
        {label("Sent", 0, "left")}
        {label("Acknowledged", 1, "center")}
        {label("Applied", 2, "right")}
      </View>
      {props.detail ? (
        <Text style={{ fontFamily: font.sans400, fontSize: 14, lineHeight: 20, color: t.inkMuted }}>{props.detail}</Text>
      ) : null}
      {failed && props.onRetry ? (
        <Button variant="secondary" icon="refresh" onPress={props.onRetry}>
          Try again
        </Button>
      ) : null}
    </View>
  );
}

const RETRY_STEPS = [1, 2, 5, 10, 10, 10];

function RetryBar(props: { s: number; state: "" | "done" | "now" }) {
  const t = useTheme();
  const blink = useBlink(1400, props.state === "now");
  const max = Math.max(...RETRY_STEPS);
  return (
    <View style={{ flex: 1, alignItems: "center", gap: space[2] }}>
      <Animated.View style={{ opacity: blink }}>
        <View
          style={{
            width: 10,
            height: 6 + (props.s / max) * 30,
            borderRadius: 5,
            backgroundColor: props.state === "now" ? t.ink : t.lineStrong,
            opacity: props.state === "" ? 0.5 : 1,
          }}
        />
      </Animated.View>
      <Text
        style={{
          fontFamily: props.state === "now" ? font.sans650 : font.sans500,
          fontSize: 11,
          lineHeight: 11,
          color: props.state === "now" ? t.ink : t.inkFaint,
          fontVariant: ["tabular-nums"],
          includeFontPadding: false,
        }}
      >
        {`${props.s} s`}
      </Text>
    </View>
  );
}

/**
 * The reconnect schedule as bars: 1, 2, 5, 10 s, then every 10 s. `attempt` is zero-based. Grey
 * throughout: nothing here is the G1 answering.
 */
export function RetrySchedule(props: { attempt: number }) {
  const t = useTheme();
  const at = props.attempt;
  return (
    <View
      accessible
      accessibilityLabel={`Reconnect attempt ${at + 1}. Retries after 1, 2, 5 and 10 seconds, then every 10 seconds.`}
      style={{ flexDirection: "row", alignItems: "flex-end", gap: space[2] }}
    >
      {RETRY_STEPS.map((s, i) => (
        <RetryBar key={i} s={s} state={i < at ? "done" : i === at ? "now" : ""} />
      ))}
      <Text style={{ fontFamily: font.sans500, fontSize: 11, lineHeight: 11, color: t.inkFaint }}>…</Text>
    </View>
  );
}
