// Screen frame, bottom sheet, list groups and the small layout pieces the screens share.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Modal, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { IconButton } from "./controls";
import Icon, { type IconName } from "./Icon";
import { font, motion, radius, space, type, useReducedMotion, useTheme } from "./theme";

/**
 * The app's screen: a header with the title and actions, a body, and a footer for the one primary
 * action. A long press on the title opens the debug log.
 */
export function Screen(props: {
  title?: string;
  subtitle?: string | undefined;
  actions?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  onTitleLongPress?: () => void;
  bodyStyle?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const header = props.title !== undefined || props.actions;
  return (
    <View style={{ flex: 1, backgroundColor: t.ground, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {header ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            minHeight: 56,
            paddingTop: 6,
            paddingBottom: 6,
            paddingRight: 8,
            paddingLeft: space[4],
          }}
        >
          <Pressable
            onLongPress={props.onTitleLongPress}
            delayLongPress={600}
            accessibilityRole="header"
            style={{ flexShrink: 1 }}
          >
            {props.title !== undefined ? <Text style={[type.heading, { color: t.ink }]}>{props.title}</Text> : null}
            {props.subtitle ? (
              <Text style={[type.caption, { fontFamily: font.mono400, letterSpacing: 0, color: t.inkFaint }]}>{props.subtitle}</Text>
            ) : null}
          </Pressable>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>{props.actions}</View>
        </View>
      ) : null}
      <View style={[{ flex: 1, overflow: "hidden", paddingHorizontal: space[4], gap: space[4] }, props.bodyStyle]}>
        {props.children}
      </View>
      {props.footer ? (
        <View style={{ paddingTop: space[3], paddingHorizontal: space[4], paddingBottom: space[4], gap: space[3] }}>{props.footer}</View>
      ) : null}
    </View>
  );
}

/** A centred caption under a footer button. */
export function Caption(props: { children: string }) {
  const t = useTheme();
  return <Text style={[type.caption, { color: t.inkFaint, textAlign: "center" }]}>{props.children}</Text>;
}

/**
 * A bottom sheet (React Native Modal) for cook, settings and confirmations. It rises over 420 ms on
 * a 240 ms scrim fade. `onClose: false` hides the close button: confirmations have two explicit
 * choices instead.
 */
export function Sheet(props: {
  visible: boolean;
  onClose: (() => void) | false;
  /** Android back. Defaults to `onClose`; a confirmation passes its safe choice. */
  onBack?: () => void;
  onDismissed?: () => void;
  title?: string;
  subtitle?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(props.visible);
  const scrim = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (props.visible) {
      setMounted(true);
      if (reduced) {
        scrim.setValue(1);
        rise.setValue(1);
        return;
      }
      Animated.parallel([
        Animated.timing(scrim, { toValue: 1, duration: motion.swap, useNativeDriver: true }),
        Animated.timing(rise, { toValue: 1, duration: motion.sheet, easing: motion.easeOut, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      const done = () => {
        setMounted(false);
        props.onDismissed?.();
      };
      if (reduced) return done();
      Animated.parallel([
        Animated.timing(scrim, { toValue: 0, duration: motion.swap, useNativeDriver: true }),
        Animated.timing(rise, { toValue: 0, duration: motion.swap, easing: motion.easeOut, useNativeDriver: true }),
      ]).start(done);
    }
    // Runs on visibility changes only.
  }, [props.visible]);

  if (!mounted) return null;
  const close = props.onClose === false ? undefined : props.onClose;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => (props.onBack ?? close)?.()}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, opacity: scrim }}>
          <Pressable
            accessibilityLabel="Close"
            accessible={close !== undefined}
            onPress={close}
            style={{ flex: 1, backgroundColor: t.scrim }}
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={props.title}
          style={{
            backgroundColor: t.surfaceRaised,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            boxShadow: t.shadow.sheet,
            paddingTop: 8,
            paddingHorizontal: space[5],
            paddingBottom: space[6] + insets.bottom,
            gap: space[5],
            opacity: rise,
            transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
          }}
        >
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.lineStrong, alignSelf: "center" }} />
          {props.title ? (
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text accessibilityRole="header" style={[type.title, { color: t.ink }]}>
                  {props.title}
                </Text>
                {typeof props.subtitle === "string" ? (
                  <Text style={[type.body, { color: t.inkMuted, marginTop: 4 }]}>{props.subtitle}</Text>
                ) : props.subtitle ? (
                  <View style={{ marginTop: 4 }}>{props.subtitle}</View>
                ) : null}
              </View>
              {close ? <IconButton icon="close" label="Close" variant="filled" onPress={close} /> : null}
            </View>
          ) : null}
          {props.children}
          {props.footer ? <View style={{ gap: space[3] }}>{props.footer}</View> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

/** A titled group of list rows with an optional one-sentence footnote. */
export function ListGroup(props: { title?: string; footnote?: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {props.title ? <Text style={[type.overline, { color: t.inkMuted, marginHorizontal: 4 }]}>{props.title}</Text> : null}
      <View style={{ borderRadius: radius.md, backgroundColor: t.surface, boxShadow: `inset 0 0 0 1px ${t.line}`, overflow: "hidden" }}>
        {props.children}
      </View>
      {props.footnote ? (
        <Text style={{ fontFamily: font.sans400, fontSize: 13, lineHeight: 18, color: t.inkFaint, paddingHorizontal: 4 }}>
          {props.footnote}
        </Text>
      ) : null}
    </View>
  );
}

/** One row in a list group: icon, title, subtitle, value or chevron. At least 60px tall. */
export function ListRow(props: {
  title: ReactNode;
  subtitle?: string;
  icon?: IconName;
  value?: string;
  chevron?: boolean;
  tone?: "danger";
  onPress?: () => void;
  divider?: boolean;
}) {
  const t = useTheme();
  const danger = props.tone === "danger";
  return (
    <Pressable
      disabled={!props.onPress}
      onPress={props.onPress}
      accessibilityRole={props.onPress ? "button" : undefined}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: space[3],
        minHeight: 60,
        paddingVertical: space[3],
        paddingHorizontal: space[4],
        backgroundColor: pressed ? t.surfaceRaised : "transparent",
        borderTopWidth: props.divider ? 1 : 0,
        borderTopColor: t.line,
      })}
    >
      {props.icon ? (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.sm,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: danger ? t.dangerWash : t.surfaceRaised,
            boxShadow: danger ? undefined : `inset 0 0 0 1px ${t.line}`,
          }}
        >
          <Icon name={props.icon} size={20} color={danger ? t.danger : t.inkMuted} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof props.title === "string" ? (
          <Text style={[type.bodyStrong, { color: danger ? t.danger : t.ink }]}>{props.title}</Text>
        ) : (
          props.title
        )}
        {props.subtitle ? (
          <Text style={{ fontFamily: font.sans400, fontSize: 13, lineHeight: 18, color: t.inkFaint }}>{props.subtitle}</Text>
        ) : null}
      </View>
      {props.value || props.chevron ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {props.value ? (
            <Text style={{ fontFamily: font.sans500, fontSize: 14, lineHeight: 18, color: t.inkMuted }}>{props.value}</Text>
          ) : null}
          {props.chevron ? <Icon name="chevron-right" size={18} color={t.inkMuted} /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

/** The Searly mark and name. Welcome and About only: the live screen's title is the G1's name. */
export function Wordmark(props: { size?: number }) {
  const t = useTheme();
  const s = props.size ?? 28;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Searly" style={{ flexDirection: "row", alignItems: "center", gap: s * 0.32 }}>
      <Svg width={s * 1.05} height={s * 1.05} viewBox="0 0 32 32">
        <Path d="M8.22 23.78A11 11 0 1 1 23.78 23.78" fill="none" stroke={t.lineStrong} strokeWidth={3.6} strokeLinecap="round" />
        <Path d="M8.22 23.78A11 11 0 1 1 24.9 9.53" fill="none" stroke={t.sear} strokeWidth={3.6} strokeLinecap="round" />
        <Circle cx={24.9} cy={9.53} r={3.4} fill={t.ink} />
      </Svg>
      <Text
        style={{
          fontFamily: font.wordmark,
          fontSize: s,
          lineHeight: s * 1.15,
          letterSpacing: s * -0.04,
          color: t.ink,
          includeFontPadding: false,
        }}
      >
        searly
      </Text>
    </View>
  );
}

export type DiscTone = "warn" | "danger" | "signal" | "info";

/** The large icon disc that heads a full-screen state. */
export function Disc(props: { tone: DiscTone; icon: IconName; size?: number; ring?: boolean }) {
  const t = useTheme();
  const c = {
    warn: { bg: t.warnWash, fg: t.warn, shadow: undefined },
    danger: { bg: t.dangerWash, fg: t.danger, shadow: undefined },
    signal: { bg: t.signalWash, fg: t.signal, shadow: props.ring === false ? undefined : `0 0 0 14px ${t.signalWash}` },
    info: { bg: t.surfaceRaised, fg: t.inkMuted, shadow: `inset 0 0 0 1px ${t.line}` },
  }[props.tone];
  const s = props.size ?? 96;
  return (
    <View
      style={{
        width: s,
        height: s,
        borderRadius: s / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.bg,
        boxShadow: c.shadow,
        marginBottom: props.size ? 0 : space[2],
      }}
    >
      <Icon name={props.icon} size={s === 96 ? 40 : 32} strokeWidth={s === 96 ? 1.6 : 1.75} color={c.fg} />
    </View>
  );
}

/** A label pinned to the device drawing, pointing left at what to look for. */
export function Callout(props: { children: string; left: number; top: number }) {
  const t = useTheme();
  return (
    <View
      style={{
        position: "absolute",
        left: props.left,
        top: props.top,
        height: 30,
        paddingHorizontal: 12,
        borderRadius: radius.pill,
        backgroundColor: t.ink,
        justifyContent: "center",
      }}
    >
      <View style={{ position: "absolute", left: -4, top: 10, width: 10, height: 10, backgroundColor: t.ink, transform: [{ rotate: "45deg" }] }} />
      <Text style={{ fontFamily: font.sans650, fontSize: 13, color: t.ground, includeFontPadding: false }}>{props.children}</Text>
    </View>
  );
}

/** A rounded well on `surface` that frames the device drawing. */
export function Well(props: { height: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          height: props.height,
          borderRadius: radius.lg,
          backgroundColor: t.surface,
          boxShadow: `inset 0 0 0 1px ${t.line}`,
          overflow: "hidden",
        },
        props.style,
      ]}
    >
      {props.children}
    </View>
  );
}

/** A short line with a leading icon or spinner (pairing wait, applied on the G1). */
export function InlineNote(props: { children: string; lead: ReactNode; color?: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      {props.lead}
      <Text style={{ fontFamily: font.sans500, fontSize: 14, lineHeight: 20, color: props.color ?? t.inkMuted, flexShrink: 1 }}>
        {props.children}
      </Text>
    </View>
  );
}

/** The card the probe drawing sits in. */
export function Tile(props: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          gap: space[3],
          padding: space[4],
          borderRadius: radius.md,
          backgroundColor: t.surface,
          boxShadow: `inset 0 0 0 1px ${t.line}`,
        },
        props.style,
      ]}
    >
      {props.children}
    </View>
  );
}
