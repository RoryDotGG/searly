// The live screen's hero: a 270 degree gauge from the core at cook start to the target.
import { useEffect, useId, useRef } from "react";
import { Animated, Text, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";

import type { Unit } from "../protocol/messages";
import Icon from "./Icon";
import { useBlinkBetween } from "./motion";
import Temp from "./Temp";
import { font, motion, type, useReducedMotion, useTheme } from "./theme";

const AnimatedPath = Animated.createAnimatedComponent(Path);

function arcPoint(c: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [c + r * Math.cos(a), c + r * Math.sin(a)];
}

export type DialState = "cooking" | "ready" | "stale" | "docked";

/**
 * `start` is the core when the cook began, never ambient (oven air, usually above the target).
 * All values are in the display unit.
 */
export default function HeatDial(props: {
  core?: number | null | undefined;
  target?: number | undefined;
  start?: number | undefined;
  unit: Unit;
  state: DialState;
  size?: number;
}) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const gid = `heat${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const size = props.size ?? 288;
  const stroke = 14;
  const c = size / 2;
  const r = c - 30;
  const state = props.state;
  const tgt = props.target ?? (props.unit === "F" ? 149 : 65);
  const from = Math.min(props.start ?? (props.unit === "F" ? 41 : 5), tgt - 1);
  const noArc = state === "docked" || state === "ready"; // no cook running: no progress, no target
  const core = props.core ?? null;
  const f = noArc || core === null ? 0 : Math.min(1, Math.max(0, (core - from) / Math.max(1, tgt - from)));
  const done = state === "cooking" && f >= 1;

  const s = arcPoint(c, r, 135);
  const e = arcPoint(c, r, 45);
  const d = `M${s[0]} ${s[1]} A${r} ${r} 0 1 1 ${e[0]} ${e[1]}`;
  const L = r * Math.PI * 1.5;

  // Readings ease: the arc and bead glide to each new value. Numbers swap instantly.
  const anim = useRef(new Animated.Value(f)).current;
  useEffect(() => {
    if (reduced) return anim.setValue(f);
    Animated.timing(anim, { toValue: f, duration: motion.reading, easing: motion.easeOut, useNativeDriver: false }).start();
  }, [f, reduced, anim]);
  const dash = anim.interpolate({ inputRange: [0, 1], outputRange: [L, 0] });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "270deg"] });
  const breathe = useBlinkBetween(0.35, 0.85, 2400, done, 0.5);

  const ticks = [];
  for (let i = 0; i <= 54; i++) {
    const deg = 135 + i * 5;
    const major = i % 9 === 0;
    const a = arcPoint(c, r + 18, deg);
    const b = arcPoint(c, r + (major ? 26 : 22), deg);
    ticks.push(
      <Line
        key={i}
        x1={a[0]}
        y1={a[1]}
        x2={b[0]}
        y2={b[1]}
        stroke={major ? t.inkFaint : t.lineStrong}
        strokeWidth={major ? 2 : 1.25}
        strokeLinecap="round"
      />,
    );
  }
  const t1 = arcPoint(c, r - 14, 45);
  const t2 = arcPoint(c, r + 14, 45);
  const unitShort = props.unit === "F" ? "°F" : "°C";
  const gradient = (
    <Defs>
      <LinearGradient id={gid} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={size} y2={0}>
        <Stop offset="0%" stopColor={t.heat[0]} />
        <Stop offset="32%" stopColor={t.heat[1]} />
        <Stop offset="55%" stopColor={t.heat[2]} />
        <Stop offset="78%" stopColor={t.heat[3]} />
        <Stop offset="100%" stopColor={t.heat[4]} />
      </LinearGradient>
    </Defs>
  );
  const layer = { position: "absolute", top: 0, left: 0, width: size, height: size } as const;
  // Stale greys the whole dial: the drawing and the number, not the labels.
  const grey = state === "stale" ? { opacity: 0.5, filter: "saturate(0.15)" } : null;
  const sub = { fontFamily: font.sans500, fontSize: 14, lineHeight: 18, color: t.inkMuted } as const;
  const subStrong = { fontFamily: font.sans600, color: t.ink, fontVariant: ["tabular-nums"] } as const;

  return (
    <View style={{ width: size, height: size, alignSelf: "center", alignItems: "center", justifyContent: "center" }}>
      <View style={[layer, grey]} importantForAccessibility="no-hide-descendants">
        {noArc ? null : (
          <View style={[layer, { opacity: t.dark ? 0.28 : 0.18, filter: "blur(10px)" }]}>
            <Svg width={size} height={size}>
              {gradient}
              <AnimatedPath
                d={d}
                fill="none"
                stroke={`url(#${gid})`}
                strokeWidth={stroke + 10}
                strokeLinecap="round"
                strokeDasharray={[L, L]}
                strokeDashoffset={dash}
              />
            </Svg>
          </View>
        )}
        <Svg width={size} height={size} style={layer}>
          {gradient}
          {ticks}
          <Path
            d={d}
            fill="none"
            stroke={noArc ? t.lineStrong : t.line}
            strokeWidth={noArc ? 5 : stroke}
            strokeLinecap="round"
            {...(noArc ? { strokeDasharray: [0.01, 11] } : {})}
          />
          {noArc ? null : (
            <AnimatedPath
              d={d}
              fill="none"
              stroke={`url(#${gid})`}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={[L, L]}
              strokeDashoffset={dash}
            />
          )}
          {noArc ? null : <Line x1={t1[0]} y1={t1[1]} x2={t2[0]} y2={t2[1]} stroke={t.ink} strokeWidth={3} strokeLinecap="round" />}
        </Svg>
        {noArc ? null : (
          <>
            {/* The rotation follows readings (JS driver); the breathing runs natively, so they sit on separate views. */}
            <Animated.View style={[layer, { transform: [{ rotate }] }]}>
              <Animated.View style={[layer, { opacity: breathe, filter: "blur(6px)" }]}>
                <Svg width={size} height={size}>
                  <Circle cx={s[0]} cy={s[1]} r={14} fill={t.sear} />
                </Svg>
              </Animated.View>
            </Animated.View>
            <Animated.View style={[layer, { transform: [{ rotate }] }]}>
              <Svg width={size} height={size}>
                <Circle cx={s[0]} cy={s[1]} r={9} fill={t.ink} stroke={t.ground} strokeWidth={3} />
              </Svg>
            </Animated.View>
          </>
        )}
      </View>

      {state === "docked" ? (
        <View style={{ alignItems: "center", gap: 6 }}>
          <Icon name="bolt" size={34} strokeWidth={1.5} color={t.signal} />
          <Text style={[type.title, { color: t.ink }]}>Docked</Text>
          <Text style={sub}>Charging in the G1</Text>
        </View>
      ) : (
        <View style={{ alignItems: "center", gap: 6 }}>
          <Text style={[type.overline, { color: t.inkMuted }]}>
            {state === "stale" ? "Last reading" : state === "ready" ? "Probe" : "Core"}
          </Text>
          <View style={grey}>
            <Temp value={core} unit={props.unit} size="hero" unitLabel="degree" />
          </View>
          {state === "ready" ? (
            <Text style={sub}>No cook running</Text>
          ) : done ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="check" size={16} color={t.signal} />
              <Text style={[sub, { fontFamily: font.sans600, color: t.signal }]}>At target</Text>
            </View>
          ) : state === "stale" ? (
            <Text style={sub}>
              Target <Text style={subStrong}>{`${Math.round(tgt)}${unitShort}`}</Text>
            </Text>
          ) : (
            <Text style={sub}>
              <Text style={subStrong}>{`${Math.max(1, Math.ceil(tgt - (core ?? from)))}°`}</Text> to go
            </Text>
          )}
          {state === "cooking" ? (
            <Text
              style={{ fontFamily: font.sans500, fontSize: 12, lineHeight: 16, letterSpacing: 0.12, color: t.inkFaint, marginTop: -4 }}
            >{`Target ${Math.round(tgt)}${unitShort}`}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}
