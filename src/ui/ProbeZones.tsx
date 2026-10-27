// The probe drawn tip to handle with its six sensors: T1 to T5 in the shaft, ambient in the cap.
import { useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Path, Rect, Text as SvgText } from "react-native-svg";

import type { Unit } from "../protocol/messages";
import Temp from "./Temp";
import { device, font, heatStep, type, useTheme } from "./theme";

/**
 * Where each part of the real probe ends, as a fraction of its length from the tip. The thick part
 * (lower steel, band, upper steel, rim) is about 37% of the length; the shaft is about 40% as wide.
 */
export const PROBE = { tip: 0.06, shaft: 0.55, taper: 0.606, lower: 0.676, band: 0.842, upper: 0.975 };
/** T1 just behind the tip, T5 at the neck, evenly spaced; the ambient sensor sits in the cap. */
const SENSORS = [0.05, 0.17, 0.29, 0.41, 0.53];
const AMBIENT_AT = 0.95;

/**
 * `zones` are the five areaTemperature readings, tip first, in the display unit; the lowest is the
 * core. Dots follow the heat ramp from `start` to `target`; with no target every dot stays neutral.
 */
export default function ProbeZones(props: {
  zones: number[];
  ambient?: number | undefined;
  start?: number | undefined;
  target?: number | undefined;
  unit: Unit;
  docked?: boolean;
  probeNumber?: string;
}) {
  const t = useTheme();
  const [w, setW] = useState(0);
  const zones = props.zones;
  const from = props.start ?? (props.unit === "F" ? 41 : 5);
  const tgt = props.target;
  const ramp = tgt !== undefined && !props.docked;
  const W = 340;
  const H = 52;
  const cy = 12;
  const L = 336;
  const thick = 10;
  const thin = 4;
  const rim = 11.5;
  const x = (f: number) => 2 + L * f;
  const core = zones.length ? zones.indexOf(Math.min(...zones)) : -1;
  const labelX = (i: number) => (W * (i + 0.5)) / 6;
  const points = [...zones.slice(0, 5).map((_, i) => x(SENSORS[i] ?? 0)), x(AMBIENT_AT)];
  const labelW = 64;

  const label = (i: number, value: number | undefined, caption: string, role: "core" | "ambient" | null) => (
    <View
      key={i}
      style={{
        position: "absolute",
        top: 0,
        left: (labelX(i) / W) * w - labelW / 2,
        width: labelW,
        alignItems: "center",
        gap: 2,
      }}
    >
      <Temp
        value={props.docked ? null : value}
        unit={props.unit}
        showUnit={false}
        decimals={value !== undefined && Math.abs(value) >= 100 ? 0 : 1}
        {...(role === "core" ? { color: t.searText } : role === "ambient" ? { color: t.inkMuted } : {})}
      />
      <Text style={[type.caption, { color: t.inkFaint }]}>{caption}</Text>
    </View>
  );

  return (
    <View
      accessible
      accessibilityLabel={`Probe sensors, tip to handle: ${zones.join(", ")}${props.ambient === undefined ? "" : `; ambient ${props.ambient}`}`}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={[type.overline, { color: t.inkMuted }]}>Tip</Text>
        <Text style={[type.overline, { color: t.inkMuted }]}>Handle</Text>
      </View>
      {w ? (
        <Svg width={w} height={(w * H) / W} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
          {points.map((px, i) => (
            <Path
              key={i}
              d={`M${px} ${cy + (i === 5 ? thick : thin) + 1}V${cy + 15}L${labelX(i)} ${H - 1}`}
              fill="none"
              stroke={t.lineStrong}
              strokeWidth={1}
            />
          ))}
          <Path
            d={`M2 ${cy}L${x(PROBE.tip)} ${cy - thin}H${x(PROBE.shaft)}L${x(PROBE.taper)} ${cy - thick}H${x(PROBE.upper)}V${cy + thick}H${x(PROBE.taper)}L${x(PROBE.shaft)} ${cy + thin}H${x(PROBE.tip)}Z`}
            fill={device.probeSteel}
          />
          <Path
            d={`M2 ${cy}L${x(PROBE.tip)} ${cy + thin}H${x(PROBE.shaft)}L${x(PROBE.taper)} ${cy + thick}H${x(PROBE.upper)}`}
            fill="none"
            stroke={device.probeSteelDark}
            strokeWidth={1.25}
          />
          <Rect
            x={x(PROBE.lower)}
            y={cy - thick + 0.75}
            width={x(PROBE.band) - x(PROBE.lower)}
            height={thick * 2 - 1.5}
            fill={device.probeBand}
            stroke={device.probeSteelDark}
            strokeWidth={1.5}
          />
          <SvgText
            x={(x(PROBE.lower) + x(PROBE.band)) / 2}
            y={cy + 4.5}
            textAnchor="middle"
            fill={device.probeSteel}
            fontFamily={font.displayBold}
            fontSize={12}
          >
            {props.probeNumber ?? "1"}
          </SvgText>
          <Rect
            x={x(PROBE.upper) - 1}
            y={cy - rim}
            width={W - 2 - x(PROBE.upper) + 1}
            height={rim * 2}
            rx={3}
            fill={device.probeSteel}
            stroke={device.probeSteelDark}
            strokeWidth={1.25}
          />
          {zones.slice(0, 5).map((v, i) => (
            <Circle
              key={i}
              cx={points[i]}
              cy={cy}
              r={3.6}
              fill={ramp ? t.heat[heatStep(v, from, tgt)] : props.docked ? t.lineStrong : t.inkFaint}
              stroke={device.probeSteelDark}
              strokeWidth={1}
            />
          ))}
          <Circle cx={points[5]} cy={cy} r={3.6} fill={t.inkMuted} stroke={device.probeSteelDark} strokeWidth={1} />
        </Svg>
      ) : null}
      <View style={{ height: 38, marginTop: 4 }}>
        {w
          ? [
              ...zones.slice(0, 5).map((v, i) => {
                const isCore = i === core && !props.docked;
                return label(i, v, `T${i + 1}${isCore ? " · Core" : ""}`, isCore ? "core" : null);
              }),
              label(5, props.ambient, "Ambient", "ambient"),
            ]
          : null}
      </View>
    </View>
  );
}
