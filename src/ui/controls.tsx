// Buttons, icon buttons, the segmented control and the spinner.
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import Icon, { type IconName } from "./Icon";
import { font, motion, radius, size, useReducedMotion, useTheme, type Theme } from "./theme";

/** Presses scale to `to` in 120 ms; instant with reduce motion. */
export function usePressScale(to: number) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const go = (v: number) => {
    if (reduced) return scale.setValue(1);
    Animated.timing(scale, { toValue: v, duration: motion.tap, easing: motion.easeOut, useNativeDriver: true }).start();
  };
  return { scale, onPressIn: () => go(to), onPressOut: () => go(1) };
}

export function Spinner(props: { color: string; size?: number }) {
  const reduced = useReducedMotion();
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, spin]);
  const s = props.size ?? 18;
  return (
    <Animated.View
      importantForAccessibility="no-hide-descendants"
      style={{
        width: s,
        height: s,
        borderRadius: s / 2,
        borderWidth: 2,
        borderColor: props.color,
        borderRightColor: "transparent",
        transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }],
      }}
    />
  );
}

type Variant = "primary" | "secondary" | "quiet" | "danger" | "signal";

function variantStyle(t: Theme, v: Variant, pressed: boolean): { bg: string; fg: string; shadow?: string } {
  switch (v) {
    case "primary":
      return { bg: pressed ? t.searPressed : t.sear, fg: t.onSear, shadow: t.shadow.glowSear };
    case "secondary":
      return { bg: pressed ? t.surfaceRaised : "transparent", fg: t.ink, shadow: `inset 0 0 0 1.5px ${t.lineStrong}` };
    case "quiet":
      return { bg: pressed ? t.searWash : "transparent", fg: t.searText };
    case "danger":
      return { bg: t.danger, fg: t.onDanger };
    case "signal":
      return { bg: t.signal, fg: t.onSignal };
  }
}

/**
 * Pill buttons. One primary per screen, at the bottom. Labels start with a verb and include the
 * value when there is one. A disabled button always has a caption or notice nearby saying why.
 */
export function Button(props: {
  children: string;
  onPress?: () => void;
  variant?: Variant;
  size?: "md" | "lg";
  block?: boolean;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
}) {
  const t = useTheme();
  const press = usePressScale(0.97);
  const variant = props.variant ?? "primary";
  const lg = props.size === "lg";
  const inactive = props.disabled || props.loading;
  return (
    <Animated.View style={{ alignSelf: props.block ? "stretch" : "flex-start", transform: [{ scale: press.scale }] }}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.children}
      accessibilityState={{ disabled: !!props.disabled, busy: !!props.loading }}
      disabled={inactive}
      onPress={props.onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={({ pressed }) => {
        const v = variantStyle(t, variant, pressed);
        const disabled = props.disabled && !props.loading;
        return [
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minHeight: lg ? size.controlLg : size.control,
            paddingHorizontal: variant === "quiet" ? 14 : lg ? 28 : 22,
            borderRadius: radius.pill,
            backgroundColor: disabled ? "transparent" : v.bg,
            boxShadow: disabled ? `inset 0 0 0 1.5px ${t.line}` : v.shadow,
          },
        ] as StyleProp<ViewStyle>;
      }}
    >
      {({ pressed }) => {
        const fg = props.disabled && !props.loading ? t.inkFaint : variantStyle(t, variant, pressed).fg;
        return (
          <>
            {props.loading ? <Spinner color={fg} /> : props.icon ? <Icon name={props.icon} size={20} color={fg} /> : null}
            <Text
              style={{
                fontFamily: font.sans600,
                fontSize: lg ? 16 : 15,
                letterSpacing: (lg ? 16 : 15) * 0.005,
                color: fg,
                includeFontPadding: false,
              }}
            >
              {props.children}
            </Text>
            {props.iconRight ? <Icon name={props.iconRight} size={20} color={fg} /> : null}
          </>
        );
      }}
    </Pressable>
    </Animated.View>
  );
}

/** A 48px round icon-only button for headers and sheet close. Never a primary action. */
export function IconButton(props: { icon: IconName; label: string; onPress?: () => void; variant?: "plain" | "filled" }) {
  const t = useTheme();
  const press = usePressScale(0.94);
  const filled = props.variant === "filled";
  return (
    <Animated.View style={{ transform: [{ scale: press.scale }] }}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      onPress={props.onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      hitSlop={4}
      style={({ pressed }) => ({
        width: size.touch,
        height: size.touch,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: filled ? (pressed ? t.surface : t.surfaceRaised) : pressed ? t.surfaceRaised : "transparent",
        boxShadow: filled ? `inset 0 0 0 1px ${t.line}` : undefined,
      })}
    >
      <Icon name={props.icon} size={22} color={t.ink} />
    </Pressable>
    </Animated.View>
  );
}

/** A pill track with a sliding thumb for two to four mutually exclusive options. */
export function SegmentedControl<V extends string>(props: {
  options: readonly { value: V; label: string; icon?: IconName }[];
  value: V | undefined;
  onChange: (value: V) => void;
  label: string;
  disabled?: boolean;
}) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const n = Math.max(1, props.options.length);
  // A value with no option (the G1 set to medium elsewhere) shows no thumb rather than a wrong one.
  const found = props.options.findIndex((o) => o.value === props.value);
  const idx = Math.max(0, found);
  const thumbW = (width - 8) / n;
  const x = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);

  useEffect(() => {
    if (!width) return;
    const to = idx * thumbW;
    if (reduced || !placed.current) {
      x.setValue(to);
      placed.current = true;
      return;
    }
    Animated.timing(x, { toValue: to, duration: motion.thumb, easing: motion.easeSpring, useNativeDriver: true }).start();
  }, [idx, thumbW, width, reduced, x]);

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={props.label}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={{
        flexDirection: "row",
        padding: 4,
        borderRadius: radius.pill,
        backgroundColor: t.surfaceSunken,
        boxShadow: `inset 0 0 0 1px ${t.line}`,
        minHeight: size.control,
      }}
    >
      {width && found >= 0 ? (
        <Animated.View
          style={{
            position: "absolute",
            top: 4,
            bottom: 4,
            left: 4,
            width: thumbW,
            borderRadius: radius.pill,
            backgroundColor: t.surfaceRaised,
            boxShadow: `${t.shadow.raised}, inset 0 0 0 1px ${t.dark ? t.lineStrong : t.line}`,
            transform: [{ translateX: x }],
          }}
        />
      ) : null}
      {props.options.map((o) => {
        const selected = o.value === props.value;
        const color = props.disabled ? t.inkFaint : selected ? t.ink : t.inkMuted;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ checked: selected, disabled: !!props.disabled }}
            disabled={props.disabled}
            onPress={() => props.onChange(o.value)}
            style={{
              flex: 1,
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingHorizontal: 10,
              borderRadius: radius.pill,
            }}
          >
            {o.icon ? <Icon name={o.icon} size={18} color={color} /> : null}
            <Text style={{ fontFamily: font.sans600, fontSize: 14, lineHeight: 18, color }} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Children laid out as the design's centred full-screen state. */
export function Centered(props: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 12 }}>
      {props.children}
    </View>
  );
}
