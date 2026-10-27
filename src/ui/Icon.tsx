// Searly's 24px stroke icons: 1.75px strokes, round caps and joins. No emoji, no other family.
import Svg, { Path } from "react-native-svg";

const ICONS = {
  bluetooth: ["M7 7.5l10 9-5 4.5V3l5 4.5-10 9"],
  "bluetooth-off": ["M7 7.5l3.5 3.15M13.6 13.6L17 16.5 12 21v-7.5M12 9.5V3l5 4.5-2.4 2.15", "M3.5 3.5l17 17"],
  bolt: ["M13 2.5L5.5 13.5h6l-1 8 8-11h-6z"],
  probe: ["M2.5 12H12.8", "M12.8 12l1.4-2h6.8a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-6.8z", "M15.5 10v4M18.8 10v4"],
  dock: ["M5 10h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z", "M12 3v9", "M9 9l3 3 3-3"],
  thermometer: ["M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z", "M12 15.5V9"],
  timer: ["M12 21a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z", "M12 9.5v4l2.5 1.5", "M9.5 2.5h5"],
  volume: ["M4 9.5h3.5L12 5.5v13l-4.5-4H4z", "M15.5 9.2a4 4 0 0 1 0 5.6", "M18.2 6.5a7.8 7.8 0 0 1 0 11"],
  "volume-low": ["M4 9.5h3.5L12 5.5v13l-4.5-4H4z", "M15.5 9.2a4 4 0 0 1 0 5.6"],
  "volume-quiet": ["M4 9.5h3.5L12 5.5v13l-4.5-4H4z"],
  mute: ["M4 9.5h3.5L12 5.5v13l-4.5-4H4z", "M16 9.5l5 5M21 9.5l-5 5"],
  sliders: [
    "M4 7h8.5M17.5 7H20M4 17h2.5M11.5 17H20",
    "M15 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM9 19.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  ],
  check: ["M5 12.5l4.5 4.5L19 7.5"],
  "check-circle": ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M8 12.2l2.8 2.8L16.2 9.5"],
  alert: [
    "M10.3 4.3L2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z",
    "M12 9.5v4",
    "M12 16.8v.2",
  ],
  info: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 11v5", "M12 7.8v.2"],
  close: ["M6 6l12 12M18 6L6 18"],
  "chevron-right": ["M9.5 5.5L16 12l-6.5 6.5"],
  "chevron-down": ["M5.5 9.5L12 16l6.5-6.5"],
  plus: ["M12 5v14M5 12h14"],
  minus: ["M5 12h14"],
  refresh: ["M20 12a8 8 0 1 1-2.4-5.7", "M20 4.5V9h-4.5"],
  unlink: ["M9.5 14.5l-2.3 2.3a3.2 3.2 0 0 1-4.5-4.5L5 10", "M14.5 9.5l2.3-2.3a3.2 3.2 0 0 1 4.5 4.5L19 14", "M3.5 3.5l17 17"],
  terminal: ["M4 6.5l5 5.5-5 5.5", "M12 18h8"],
  "cloud-off": ["M7 18.5h9.5M20.5 15.5A4.2 4.2 0 0 0 17 10.1 6 6 0 0 0 8.9 6.2", "M5.6 8.3A4.5 4.5 0 0 0 7 18.5", "M3.5 3.5l17 17"],
  phone: ["M8 2.5h8a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2z", "M11 18.5h2"],
  pencil: ["M14.5 5.5l4 4L8.5 19.5H4.5v-4z", "M12.5 7.5l4 4"],
  copy: ["M9 9h10.5v10.5H9z", "M15 9V4.5H4.5V15H9"],
  search: ["M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "M15.5 15.5L20.5 20.5"],
  settings: [
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h0a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v0a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z",
  ],
  lock: [
    "M6.5 10.5h11a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-7a1.5 1.5 0 0 1 1.5-1.5z",
    "M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3",
  ],
} as const;

export type IconName = keyof typeof ICONS;

/** Decorative unless `title` is given; then it is announced. */
export default function Icon(props: { name: IconName; color: string; size?: number; strokeWidth?: number; title?: string }) {
  const size = props.size ?? 24;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={props.color}
      strokeWidth={props.strokeWidth ?? 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={props.title !== undefined}
      {...(props.title ? { accessibilityLabel: props.title } : {})}
      importantForAccessibility={props.title ? "yes" : "no-hide-descendants"}
    >
      {ICONS[props.name].map((d, i) => (
        <Path key={i} d={d} />
      ))}
    </Svg>
  );
}
