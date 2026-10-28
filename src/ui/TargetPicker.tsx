// The cook sheet's target: a large value, minus and plus keys, and a ruler you drag.
import { useRef, useState } from "react";
import { Animated, PanResponder, Pressable, Text, View, type AccessibilityActionEvent } from "react-native";

import type { Unit } from "../protocol/messages";
import { usePressScale } from "./controls";
import Icon from "./Icon";
import Temp from "./Temp";
import { font, radius, space, useTheme } from "./theme";

/** Assumed limits until the official app's are known (docs/SPEC.md). */
export const TARGET_RANGE = { C: [30, 100], F: [86, 212] } as const;
const PX = 12; // one degree per 12px of drag

function StepKey(props: { icon: "minus" | "plus"; label: string; disabled: boolean; onPress: () => void }) {
  const t = useTheme();
  const press = usePressScale(0.92);
  return (
    <Animated.View style={{ transform: [{ scale: press.scale }], opacity: props.disabled ? 0.35 : 1 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={props.label}
        accessibilityState={{ disabled: props.disabled }}
        disabled={props.disabled}
        onPress={props.onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={({ pressed }) => ({
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed ? t.surface : t.surfaceRaised,
          boxShadow: `inset 0 0 0 1px ${t.lineStrong}`,
        })}
      >
        <Icon name={props.icon} size={24} color={t.ink} />
      </Pressable>
    </Animated.View>
  );
}

/** `value` is in the display unit; convert to tenths of °F when sending. */
export default function TargetPicker(props: {
  value: number;
  onChange: (value: number) => void;
  unit: Unit;
  disabled?: boolean;
  /** The colour behind the picker, which the ruler's ends fade into. */
  fadeTo: string;
}) {
  const t = useTheme();
  const [min, max] = TARGET_RANGE[props.unit];
  const [live, setLive] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const latest = useRef({ value: props.value, onChange: props.onChange, disabled: props.disabled, width });
  latest.current = { value: props.value, onChange: props.onChange, disabled: props.disabled, width };
  const dragFrom = useRef(0);
  const tapX = useRef(0);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const set = (v: number) => props.onChange(clamp(Math.round(v)));

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.disabled,
      onMoveShouldSetPanResponder: () => !latest.current.disabled,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        dragFrom.current = latest.current.value;
        tapX.current = e.nativeEvent.locationX;
      },
      onPanResponderMove: (_, g) => setLive(Math.min(max, Math.max(min, dragFrom.current - g.dx / PX))),
      onPanResponderRelease: (_, g) => {
        // A tap jumps to the tick under the finger; a drag snaps on release.
        const v =
          Math.abs(g.dx) < 4
            ? dragFrom.current + (tapX.current - latest.current.width / 2) / PX
            : dragFrom.current - g.dx / PX;
        latest.current.onChange(Math.min(max, Math.max(min, Math.round(v))));
        setLive(null);
      },
      onPanResponderTerminate: () => setLive(null),
    }),
  ).current;

  const shown = live ?? props.value;
  const ticks = [];
  for (let v = min; v <= max; v++) {
    const off = (v - shown) * PX;
    if (Math.abs(off) > 220) continue;
    const major = v % 5 === 0;
    const left = width / 2 + off;
    ticks.push(
      <View
        key={`t${v}`}
        style={{
          position: "absolute",
          top: 12,
          left: left - 1,
          width: 2,
          height: major ? 22 : 14,
          borderRadius: 1,
          backgroundColor: major ? t.inkFaint : t.lineStrong,
        }}
      />,
    );
    if (v % 10 === 0) {
      ticks.push(
        <Text
          key={`n${v}`}
          style={{
            position: "absolute",
            top: 40,
            left: left - 20,
            width: 40,
            textAlign: "center",
            fontFamily: font.sans500,
            fontSize: 11,
            lineHeight: 11,
            color: t.inkFaint,
            fontVariant: ["tabular-nums"],
            includeFontPadding: false,
          }}
        >
          {v}
        </Text>,
      );
    }
  }
  const unitLabel = props.unit === "F" ? "°F" : "°C";
  const small = { fontFamily: font.sans500, fontSize: 12, lineHeight: 16, color: t.inkFaint } as const;
  const onAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === "increment") set(props.value + 1);
    if (e.nativeEvent.actionName === "decrement") set(props.value - 1);
  };

  return (
    <View style={{ gap: space[4] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <StepKey icon="minus" label="Lower target by 1 degree" disabled={!!props.disabled || props.value <= min} onPress={() => set(props.value - 1)} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Temp value={Math.round(shown)} unit={props.unit} size="xl" decimals={0} />
        </View>
        <StepKey icon="plus" label="Raise target by 1 degree" disabled={!!props.disabled || props.value >= max} onPress={() => set(props.value + 1)} />
      </View>
      <View
        {...pan.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Target temperature"
        accessibilityValue={{ min, max, now: props.value, text: `${props.value} ${unitLabel}` }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={onAction}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{
          height: 64,
          borderRadius: radius.md,
          backgroundColor: t.surfaceSunken,
          boxShadow: `inset 0 0 0 1px ${t.line}`,
          overflow: "hidden",
        }}
      >
        <View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}>
          {width ? ticks : null}
        </View>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: "50%",
            top: 6,
            bottom: 6,
            width: 3,
            marginLeft: -1.5,
            borderRadius: 2,
            backgroundColor: t.sear,
          }}
        />
        {/* The ends fade out, as the design's mask does. */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundImage: `linear-gradient(90deg, ${props.fadeTo} 0%, transparent 18%, transparent 82%, ${props.fadeTo} 100%)`,
          }}
        />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={small}>{`${min}${unitLabel}`}</Text>
        <Text style={small}>Drag or tap</Text>
        <Text style={small}>{`${max}${unitLabel}`}</Text>
      </View>
    </View>
  );
}
