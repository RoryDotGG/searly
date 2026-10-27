// A temperature in the G1's LCD style: big whole degrees, a small faint decimal, a quiet unit.
import { Text, View, type TextStyle } from "react-native";

import type { Unit } from "../protocol/messages";
import { font, useTheme } from "./theme";

const SIZES = {
  hero: { size: 104, lineHeight: 0.9, spacing: -0.045, family: font.hero, unitFamily: font.heroUnit, dec: 0.42, unit: 0.34 },
  xl: { size: 72, lineHeight: 1, spacing: -0.035, family: font.xl, unitFamily: font.xlUnit, dec: 0.42, unit: 0.34 },
  lg: { size: 36, lineHeight: 1, spacing: -0.02, family: font.xl, unitFamily: font.xlUnit, dec: 0.42, unit: 0.34 },
  md: { size: 17, lineHeight: 20 / 17, spacing: -0.01, family: font.display, unitFamily: font.display, dec: 0.8, unit: 0.7 },
} as const;

/**
 * `value` is in the display unit (convert from tenths of °F first). null renders "--", like the G1
 * with no reading: never show 0 for a missing value.
 */
export default function Temp(props: {
  value: number | null | undefined;
  unit: Unit;
  size?: keyof typeof SIZES;
  decimals?: number;
  showUnit?: boolean;
  unitLabel?: "full" | "degree";
  color?: string;
}) {
  const t = useTheme();
  const z = SIZES[props.size ?? "md"];
  const md = props.size === undefined || props.size === "md";
  const empty = props.value === null || props.value === undefined || Number.isNaN(props.value);
  const unitText = props.unitLabel === "degree" ? "°" : `°${props.unit}`;
  const s = empty ? "--" : props.value!.toFixed(props.decimals ?? 1);
  const dot = s.indexOf(".");
  const whole = dot < 0 ? s : s.slice(0, dot);
  const dec = dot < 0 ? null : s.slice(dot);

  const base: TextStyle = {
    fontFamily: z.family,
    fontVariant: ["tabular-nums"],
    includeFontPadding: false,
  };
  const decSize = z.size * z.dec;
  const unitSize = z.size * z.unit;
  return (
    <View
      style={{ flexDirection: "row", alignItems: "baseline" }}
      accessible
      accessibilityLabel={empty ? "No reading" : `${s} °${props.unit}`}
    >
      <Text
        style={[
          base,
          {
            fontSize: z.size,
            lineHeight: z.size * z.lineHeight,
            letterSpacing: z.size * z.spacing,
            color: empty ? t.inkFaint : (props.color ?? t.ink),
          },
        ]}
      >
        {whole}
      </Text>
      {dec ? (
        <Text
          style={[
            base,
            {
              fontSize: decSize,
              lineHeight: decSize * z.lineHeight,
              letterSpacing: decSize * -0.01,
              marginLeft: decSize * 0.02,
              color: t.inkFaint,
            },
          ]}
        >
          {dec}
        </Text>
      ) : null}
      {props.showUnit === false ? null : (
        <Text
          style={[
            base,
            {
              fontFamily: z.unitFamily,
              fontSize: unitSize,
              lineHeight: unitSize * z.lineHeight,
              marginLeft: unitSize * 0.12,
              color: t.inkMuted,
            },
            // Raised so the unit's top sits level with the digits' top, as the design's flex-start
            // plus 0.18em does. Bricolage's digits and degree sign both reach 0.66em.
            md ? null : { transform: [{ translateY: -(0.66 * z.size - 0.667 * unitSize + 0.02 * z.size) }] },
          ]}
        >
          {unitText}
        </Text>
      )}
    </View>
  );
}
