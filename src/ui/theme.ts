// Searly design tokens, for React Native. docs/DESIGN.md says how to use them.
// Char (dark) is the default; Daylight follows the system setting.
import { useEffect, useState } from "react";
import { AccessibilityInfo, Easing, useColorScheme, type TextStyle } from "react-native";

const char = {
  ground: "#0f0d0c",
  surface: "#181514",
  surfaceRaised: "#221d1b",
  surfaceSunken: "#090807",
  line: "#2e2724",
  lineStrong: "#7e6f66",
  ink: "#f7f0e9",
  inkMuted: "#b8aaa0",
  inkFaint: "#9a8c82",
  sear: "#ff6436",
  searPressed: "#ff8358",
  onSear: "#1d0a03",
  searText: "#ff8b66",
  searWash: "rgba(255, 100, 54, 0.14)",
  signal: "#5ccfee",
  onSignal: "#03212b",
  signalWash: "rgba(92, 207, 238, 0.13)",
  warn: "#f5b740",
  onWarn: "#271a00",
  warnWash: "rgba(245, 183, 64, 0.13)",
  danger: "#ff7d8c",
  onDanger: "#2a0409",
  dangerWash: "rgba(255, 125, 140, 0.13)",
  focus: "#ffd08a",
  scrim: "rgba(0, 0, 0, 0.62)",
  heat: ["#5ab8e6", "#e7cf8a", "#f6a33f", "#ff6c38", "#ef3d2c"] as readonly [string, string, string, string, string],
};

const daylight: typeof char = {
  ground: "#f4eee7",
  surface: "#fbf7f2",
  surfaceRaised: "#ffffff",
  surfaceSunken: "#ebe3da",
  line: "#e2d8ce",
  lineStrong: "#948579",
  ink: "#1c1513",
  inkMuted: "#5c4f47",
  inkFaint: "#6f6158",
  sear: "#c53a12",
  searPressed: "#a32e0c",
  onSear: "#ffffff",
  searText: "#b3340f",
  searWash: "rgba(197, 58, 18, 0.09)",
  signal: "#0a6a89",
  onSignal: "#ffffff",
  signalWash: "rgba(10, 106, 137, 0.09)",
  warn: "#865600",
  onWarn: "#ffffff",
  warnWash: "rgba(134, 86, 0, 0.09)",
  danger: "#b0213a",
  onDanger: "#ffffff",
  dangerWash: "rgba(176, 33, 58, 0.08)",
  focus: "#1c1513",
  scrim: "rgba(28, 21, 19, 0.38)",
  heat: ["#2a86b5", "#a88220", "#d47410", "#c94416", "#a8231a"],
};

/** Hardware colours: the same in both themes because they depict the G1 and the probe. */
export const device = {
  lcdGlass: "#9fe6f6",
  lcdSegment: "#1a2f8f",
  lcdGhost: "rgba(26, 47, 143, 0.09)",
  body: "#d8372a",
  shade: "#a92418",
  key: "#cc3024",
  probeSteel: "#c4c8cc",
  probeSteelDark: "#80868c",
  probeBand: "#1b1b1e",
};

const shadows = {
  dark: {
    sheet: "0 -16px 48px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
    raised: "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 10px 28px rgba(0, 0, 0, 0.4)",
    glowSignal: "0 0 0 6px rgba(92, 207, 238, 0.16)",
  },
  light: {
    sheet: "0 -10px 36px rgba(60, 28, 10, 0.16)",
    raised: "0 1px 2px rgba(60, 28, 10, 0.08), 0 10px 28px rgba(60, 28, 10, 0.08)",
    glowSignal: "0 0 0 6px rgba(10, 106, 137, 0.12)",
  },
};

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;
export const radius = { xs: 6, sm: 12, md: 18, lg: 28, pill: 999 } as const;
export const size = { touch: 48, control: 52, controlLg: 60, icon: 24, dial: 288 } as const;

/**
 * Font families as embedded by the expo-font plugin (Android uses the file name). Bricolage is cut
 * into static instances at the weight, optical size and width each style asks for, because React
 * Native cannot set font-variation-settings.
 */
export const font = {
  hero: "Bricolage-Hero", // 600, opsz 96, wdth 78
  heroUnit: "Bricolage-HeroUnit", // 500, opsz 96, wdth 78
  xl: "Bricolage-XL", // 600, opsz 96, wdth 82
  xlUnit: "Bricolage-XLUnit", // 500, opsz 96, wdth 82
  titleLg: "Bricolage-TitleLg", // 650, opsz 96, wdth 88
  title: "Bricolage-Title", // 650, opsz 48, wdth 92
  heading: "Bricolage-Heading", // 600, opsz 24
  wordmark: "Bricolage-Wordmark", // 700, opsz 72, wdth 85
  display: "Bricolage-Text", // 600 at text sizes: temp-md, the timer
  displayBold: "Bricolage-TextBold", // 700 at text sizes
  sans400: "InstrumentSans_400Regular",
  sans500: "InstrumentSans_500Medium",
  sans600: "InstrumentSans_600SemiBold",
  sans650: "InstrumentSans-650",
  sans700: "InstrumentSans_700Bold",
  mono400: "JetBrainsMono_400Regular",
  mono600: "JetBrainsMono_600SemiBold",
} as const;

const em = (size: number, e: number) => size * e;

/** The type scale. Colours are applied by the caller. */
export const type = {
  titleLg: { fontFamily: font.titleLg, fontSize: 36, lineHeight: 38, letterSpacing: em(36, -0.025) },
  title: { fontFamily: font.title, fontSize: 26, lineHeight: 30, letterSpacing: em(26, -0.018) },
  heading: { fontFamily: font.heading, fontSize: 19, lineHeight: 24, letterSpacing: em(19, -0.008) },
  bodyLg: { fontFamily: font.sans400, fontSize: 17, lineHeight: 25 },
  body: { fontFamily: font.sans400, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: font.sans600, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: font.sans600, fontSize: 14, lineHeight: 18, letterSpacing: em(14, 0.005) },
  caption: { fontFamily: font.sans500, fontSize: 12, lineHeight: 16, letterSpacing: em(12, 0.01) },
  overline: { fontFamily: font.sans600, fontSize: 12, lineHeight: 16 },
  mono: { fontFamily: font.mono400, fontSize: 12, lineHeight: 18 },
  monoStrong: { fontFamily: font.mono600, fontSize: 12, lineHeight: 18 },
} satisfies Record<string, TextStyle>;

export type Colors = typeof char;
export type Theme = Colors & { dark: boolean; shadow: (typeof shadows)["dark"] };

const themes: { dark: Theme; light: Theme } = {
  dark: { ...char, dark: true, shadow: shadows.dark },
  light: { ...daylight, dark: false, shadow: shadows.light },
};

export function useTheme(): Theme {
  return useColorScheme() === "light" ? themes.light : themes.dark;
}

/** Motion tokens. */
export const motion = {
  easeOut: Easing.bezier(0.22, 1, 0.36, 1),
  easeSpring: Easing.bezier(0.34, 1.4, 0.64, 1),
  easeInOut: Easing.inOut(Easing.ease),
  tap: 120,
  swap: 240,
  reading: 700,
  sheet: 420,
  thumb: 380,
};

/** With reduce motion on, everything is instant. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

/** The heat ramp step for a value between the core at cook start and the target. */
export function heatStep(value: number, from: number, target: number): 0 | 1 | 2 | 3 | 4 {
  const t = Math.min(1, Math.max(0, (value - from) / Math.max(1, target - from)));
  return Math.round(t * 4) as 0 | 1 | 2 | 3 | 4;
}
