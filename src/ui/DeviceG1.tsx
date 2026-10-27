// The G1, drawn from simple shapes so setup can show exactly what to look at. A simplified drawing,
// not a reproduction: never ThermoMaven's logo, artwork or photos. Only LCD states seen on hardware.
import { useEffect, useState } from "react";
import { Animated, View } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Polygon, Rect, Text as SvgText } from "react-native-svg";

import { useLoop } from "./motion";
import { PROBE } from "./ProbeZones";
import { device, font, useReducedMotion, useTheme } from "./theme";

const SEG: Record<string, string> = {
  "0": "abcdef", "1": "bc", "2": "abdeg", "3": "abcdg", "4": "bcfg", "5": "acdfg", "6": "acdefg", "7": "abc",
  "8": "abcdefg", "9": "abcdfg", "-": "g", " ": "", O: "abcdef", F: "aefg", P: "abefg", A: "abcefg", r: "eg",
  E: "adefg", n: "ceg", C: "adef", L: "def", b: "cdefg", d: "bcdeg", H: "bcefg", t: "defg", u: "cde", S: "acdfg",
  y: "bcdfg", o: "cdeg", i: "c",
};

function segPolys(W: number, H: number, th: number): Record<string, [number, number][]> {
  const g = 1.2;
  const L = th / 2;
  const R = W - th / 2;
  const T = th / 2;
  const M = H / 2;
  const B = H - th / 2;
  const q = th / 2;
  const hz = (xa: number, xb: number, y: number): [number, number][] => [
    [xa, y], [xa + q, y - q], [xb - q, y - q], [xb, y], [xb - q, y + q], [xa + q, y + q],
  ];
  const vt = (x: number, ya: number, yb: number): [number, number][] => [
    [x, ya], [x + q, ya + q], [x + q, yb - q], [x, yb], [x - q, yb - q], [x - q, ya + q],
  ];
  return {
    a: hz(L + g, R - g, T), g: hz(L + g, R - g, M), d: hz(L + g, R - g, B),
    f: vt(L, T + g, M - g), b: vt(R, T + g, M - g), e: vt(L, M + g, B - g), c: vt(R, M + g, B - g),
  };
}

/**
 * Seven-segment glyphs with ghosted unlit segments, like the G1's LCD, placed at (x, y) with the
 * given height. Illustration only: live readings use Temp.
 */
function SegmentDisplay(props: { text: string; x: number; y: number; height: number }) {
  const W = 28;
  const H = 50;
  const th = 5.4;
  const adv = W + 9;
  const polys = segPolys(W, H, th);
  const chars: { ch: string; dot: boolean }[] = [];
  for (const ch of props.text) {
    const last = chars[chars.length - 1];
    if (ch === "." && last) last.dot = true;
    else if (ch !== ".") chars.push({ ch, dot: false });
  }
  const k = props.height / (H + 4);
  return (
    <G transform={`translate(${props.x} ${props.y}) scale(${k}) translate(4 2) skewX(-6)`}>
      {chars.map((c, i) => {
        const on = SEG[c.ch] ?? "";
        return (
          <G key={i} transform={`translate(${i * adv + 4} 0)`}>
            {"abcdefg".split("").map((s) => (
              <Polygon
                key={s}
                points={(polys[s] ?? []).map((p) => p.join(",")).join(" ")}
                fill={on.includes(s) ? device.lcdSegment : device.lcdGhost}
              />
            ))}
            {c.dot ? <Circle cx={W + 4.5} cy={H - th / 2} r={th / 2 + 0.3} fill={device.lcdSegment} /> : null}
          </G>
        );
      })}
    </G>
  );
}

/** A ring that grows and fades from a shape, drawn over the device (the design's sr-ring). */
function PulseRing(props: { left: number; top: number; width: number; height: number; radius: number; stroke: number }) {
  const t = useTheme();
  const v = useLoop(1800);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: props.left,
        top: props.top,
        width: props.width,
        height: props.height,
        borderRadius: props.radius,
        borderWidth: props.stroke,
        borderColor: t.ink,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }],
      }}
    />
  );
}

/** Toggles between true and false every half `ms` (steps, not a fade), like the G1's own blink. */
function useStepBlink(ms: number, on: boolean): boolean {
  const reduced = useReducedMotion();
  const [lit, setLit] = useState(true);
  useEffect(() => {
    setLit(true);
    if (!on || reduced) return;
    const id = setInterval(() => setLit((v) => !v), ms / 2);
    return () => clearInterval(id);
  }, [ms, on, reduced]);
  return lit;
}

/**
 * The G1 with its probe docked and the LCD reading OFF, as it is during pairing. `highlight` pulses
 * a ring on the OK key or the probe's cap; `crop` is how much of the body to show, in drawing units.
 */
export default function DeviceG1(props: {
  width: number;
  crop: number;
  highlight?: "ok" | "probe";
  bluetoothBlink?: boolean;
}) {
  const top = -50; // headroom for the probe's cap above the body
  const k = props.width / 200;
  const height = (props.crop - top) * k;
  const pc = 139;
  const thick = 22;
  const thin = 9;
  const rimW = 25;
  const len = 355;
  const py = (f: number) => -10 + len * (1 - f); // y of a point on the docked probe, by fraction from the tip
  const seg = device.lcdSegment;
  const lit = useStepBlink(1000, !!props.bluetoothBlink);
  const keyLabel = { fontFamily: font.sans700, fontSize: 12, letterSpacing: 0.48 } as const;
  // Drawing units to view points.
  const at = (x: number, y: number) => ({ left: x * k, top: (y - top) * k });

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="ThermoMaven G1"
      style={{ width: props.width, height }}
    >
      <Svg width={props.width} height={height} viewBox={`0 ${top} 200 ${props.crop - top}`}>
        <Defs>
          <ClipPath id="g1crop">
            <Rect x={-40} y={top - 30} width={280} height={props.crop - top + 30} />
          </ClipPath>
        </Defs>
        <G clipPath="url(#g1crop)">
          {/* Probe, top down: rim, upper steel, band, lower steel, neck, shaft, tip. Only the rim shows while docked. */}
          <Path
            d={`M${pc - thin / 2} ${py(PROBE.shaft)}V${py(PROBE.tip)}L${pc} ${py(0)}L${pc + thin / 2} ${py(PROBE.tip)}V${py(PROBE.shaft)}Z`}
            fill={device.probeSteel}
          />
          <Rect x={pc + 1} y={py(PROBE.shaft)} width={2} height={py(PROBE.tip) - py(PROBE.shaft)} rx={1} fill={device.probeSteelDark} opacity={0.5} />
          <Path
            d={`M${pc - thick / 2} ${py(PROBE.taper)}H${pc + thick / 2}L${pc + thin / 2} ${py(PROBE.shaft)}H${pc - thin / 2}Z`}
            fill={device.probeSteel}
          />
          <Rect x={pc - thick / 2} y={py(PROBE.upper)} width={thick} height={py(PROBE.taper) - py(PROBE.upper)} fill={device.probeSteel} />
          <Rect x={pc + 4} y={py(PROBE.upper)} width={4} height={py(PROBE.taper) - py(PROBE.upper)} fill={device.probeSteelDark} opacity={0.5} />
          <Rect
            x={pc - thick / 2 + 0.75}
            y={py(PROBE.band)}
            width={thick - 1.5}
            height={py(PROBE.lower) - py(PROBE.band)}
            rx={1.5}
            fill={device.probeBand}
            stroke={device.probeSteelDark}
            strokeWidth={1.5}
          />
          <SvgText x={pc} y={(py(PROBE.band) + py(PROBE.lower)) / 2 + 5} textAnchor="middle" fill={device.probeSteel} fontFamily={font.displayBold} fontSize={14}>
            1
          </SvgText>
          <Rect
            x={pc - rimW / 2}
            y={py(1)}
            width={rimW}
            height={py(PROBE.upper) - py(1) + 1}
            rx={3}
            fill={device.probeSteel}
            stroke={device.probeSteelDark}
            strokeWidth={1.25}
          />

          <Rect x={20} y={6} width={160} height={560} rx={44} fill={device.body} />
          <Rect x={20.75} y={6.75} width={158.5} height={558.5} rx={43.25} fill="none" stroke={device.shade} strokeWidth={1.5} opacity={0.8} />
          <Rect x={40} y={46} width={120} height={148} rx={7} fill={device.lcdGlass} />
          <Rect x={40} y={46} width={120} height={148} rx={7} fill="none" stroke={device.shade} strokeWidth={1.5} />
          <G
            transform="translate(54 54) scale(0.55)"
            fill="none"
            stroke={seg}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={lit ? 1 : 0.35}
          >
            <Path d="M7 7.5l10 9-5 4.5V3l5 4.5-10 9" />
          </G>
          <G transform="translate(91 54) scale(0.55)" fill="none" stroke={seg} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
            <Path d="M16 9.5l5 5M21 9.5l-5 5" />
          </G>
          <Rect x={128} y={58} width={18} height={9} rx={1.5} fill="none" stroke={seg} strokeWidth={1.4} />
          <Rect x={130.5} y={60.5} width={13} height={4} fill={seg} />
          <Line x1={48} y1={74} x2={152} y2={74} stroke={seg} strokeWidth={1} />
          {/* Docked: the G1 shows OFF. */}
          <SegmentDisplay text="OFF" x={52} y={92} height={40} />

          <Circle cx={66} cy={254} r={21} fill={device.key} stroke={device.shade} strokeWidth={1.5} />
          <SvgText x={66} y={258.5} textAnchor="middle" fill={device.shade} {...keyLabel}>
            SET
          </SvgText>
          <Circle cx={66} cy={310} r={21} fill={device.key} stroke={device.shade} strokeWidth={1.5} />
          <SvgText x={66} y={314.5} textAnchor="middle" fill={device.shade} {...keyLabel}>
            OK
          </SvgText>
          {props.highlight === "ok" ? <OkRing /> : null}
          <Rect x={112} y={232} width={44} height={100} rx={22} fill={device.key} stroke={device.shade} strokeWidth={1.5} />
          <Path
            d="M126 258l8-8 8 8M126 306l8 8 8-8"
            fill="none"
            stroke={device.shade}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      </Svg>
      {props.highlight === "ok" ? <PulseRing {...at(66 - 24, 310 - 24)} width={48 * k} height={48 * k} radius={24 * k} stroke={3 * k} /> : null}
      {props.highlight === "probe" ? (
        <PulseRing {...at(pc - 23, py(1) - 6)} width={46 * k} height={30 * k} radius={10 * k} stroke={3 * k} />
      ) : null}
    </View>
  );
}

function OkRing() {
  const t = useTheme();
  return <Circle cx={66} cy={310} r={24} fill="none" stroke={t.ink} strokeWidth={2.5} />;
}
