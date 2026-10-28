# Searly design

This is the source of truth for how Searly looks, reads and moves. Token values live in
[src/ui/theme.ts](../src/ui/theme.ts); the names below are the ones exported there.

Searly is a free, offline app that controls a ThermoMaven G1 over Bluetooth. No account, no cloud, no tracking. The design follows from where it is used: a phone propped up in a kitchen, often across the room, often with greasy fingers, often at night. Every screen has to be readable at a glance and operable with a thumb.

## Principles

1. **Glance first.** The core temperature is the biggest thing on the live screen, always in the same place, with how far it has to go ("11° to go") right under it. Everything else is smaller and quieter, and nothing is shown twice. If you can read one number from two metres away, the screen works.
2. **The G1 has the last word.** A receipt means the G1 heard. A status report means the G1 did it. Searly shows the difference: a change is only *Applied* (cyan) once the next `WT10:status:report` carries it.
3. **Say what happens next.** Every state ends in a sentence about the next step or what Searly is already doing about it: "Take the probe out to start a cook", "Searly keeps trying while the app is open".
4. **Nothing pretends.** No fake numbers for a docked probe, no spinner without a reason, no hidden retries. When data stops, the reading greys out and a counter climbs.
5. **Yours, offline.** The pairing lives in the phone's secure storage. Copy never implies a service, an account or a sync.

## Voice

UK English, sentence case, short sentences. No exclamation marks, no emoji, no "Oops". Address the person as "you" and the hardware as "the G1" and "the probe". The app calls itself "Searly", never "we".

| Say | Don't say |
| --- | --- |
| Press OK on the G1 | Please confirm on your device! |
| No data for 14 s | Connection lost :( |
| Switching to Smart ends the Manual cook. The timer restarts from 0:00. | Are you sure? |
| Docked, charging | Probe unavailable |
| No reply from the G1 | Error 11: request failed |
| Forget this G1 | Unpair device |

Buttons start with a verb and say exactly what will happen, including the value: "Start Manual cook at 65°", "Update target to 70°", "Start new Smart cook". Never show raw JSON or error codes outside the debug log.

## Colour

Searly is dark first. `Char` (dark) is the default theme; `Daylight` is for bright kitchens and follows the system setting. Read colours with `useTheme()`.

Colour has three jobs, and each hue does exactly one:

- **Ember is heat and action.** `sear` fills the one primary button per screen, with `onSear` text. `searText` marks ember text on surfaces. Glow (`shadow.glowSear`) only ever sits on something hot or the primary action.
- **Cyan is the G1 talking.** `signal` means live, confirmed, applied, paired. It nods to the G1's backlit LCD. Never use it decoratively.
- **Amber needs you.** `warn` is for stale data, Bluetooth off, permissions and mode switches that restart the timer.

`danger` is rare: Forget this G1, pairing declined, no reply. It always comes with an icon and a word, never colour alone, because it sits close to ember in hue. Success and danger are set apart by hue family (cyan against rose), not by red against green.

Surfaces step from `ground` (the screen) to `surface` (cards) to `surfaceRaised` (sheets). `surfaceSunken` is for wells: the segmented control track, the ruler, the debug log. Text is `ink`, `inkMuted` or `inkFaint`; every text token holds 4.5:1 on `ground`, `surface` and `surfaceRaised` in both themes.

### The heat ramp

`heat[0]` to `heat[4]` colour temperatures by how far they have come from the start of the cook to the target, in five steps: cold cyan, sand, amber, ember, deep red. They are for probe sensors and the heat dial only, never for text. A value maps to `round((value - start) / (target - start) * 4)`, clamped to 0 to 4 (`heatStep()`), where `start` is the core temperature when the cook began: Searly records it from the first status report it sees for that `cookUuid`. Never use ambient here. Ambient is the air in the oven or grill, usually far above the target.

### Device colours

The `device` tokens (`lcdGlass`, `lcdSegment`, `lcdGhost`, `body`, `shade`, `key` and `probe*`) paint the drawn G1 and probe. They are the same in both themes because they depict hardware, and they never appear in UI chrome.

## Type

- **Bricolage Grotesque** for numerals and titles. Temperatures use its narrow widths (`wdth` 78 to 88) and tabular figures so a changing reading never jiggles.
- **Instrument Sans** for all running text, labels and buttons.
- **JetBrains Mono** for device identifiers (`TM-WT10-3F2A`) and the debug log.

React Native cannot set font variation axes, so Bricolage ships as static instances in [assets/fonts](../assets/fonts), each cut at the weight, optical size and width one style needs (see `font` in `theme.ts`). Instrument Sans 650 is cut the same way; the other Instrument Sans weights and JetBrains Mono come from `@expo-google-fonts`. All are embedded by the `expo-font` plugin in `app.json`. To add a style, cut a new instance rather than stretching an existing one.

Temperatures follow the G1's own screen: **the decimal is small and faint** (`25.6` reads as a big 25 and a small .6). The core shows one decimal; target and ambient show none. In °F, values of 100 or more drop the decimal in probe zones. Use the `Temp` component rather than formatting by hand.

| Number | `Temp` size | Where |
| --- | --- | --- |
| Core | `hero` | Inside the heat dial |
| Target picker | `xl` | Cook sheet |
| Zones, inline | `md` | Probe zones |

## Layout

- Phone first, single column, `space[4]` (16) side gutter. Design at 360 to 412dp wide.
- **One primary action, at the bottom**, inside the thumb zone, at `size.controlLg` (60). Secondary actions sit above or beside it, never in the header.
- Everything tappable is at least `size.touch` (48).
- Sections are `space[6]` apart; card contents `space[3]`.
- Cook, settings and confirmations are bottom sheets (`Sheet`, a React Native `Modal`), never new screens. There is no navigation library: the root switches on connection state.

## Shape and depth

Radii are generous and soft: `radius.md` for cards and notices, `radius.lg` for sheet tops, `radius.pill` for buttons, pills and the segmented control. Depth comes from stepping surfaces and 1px `line` hairlines; shadows are reserved for sheets (`shadow.sheet`) and the segmented thumb (`shadow.raised`). Notices are full tinted washes with an icon disc; never a coloured left border.

Focus is a 2px solid `focus` ring with a 2px offset, at least 3:1 on every surface.

## Motion

Motion explains data arriving. Nothing moves for decoration. Durations and curves are in `motion`.

- **Heartbeat.** Each status report (every 2 s) pulses the Live pill's dot once. When reports stop, the pulse stops, and the pill turns amber.
- **Readings ease.** The dial's arc and bead glide to each new reading over 700 ms (`motion.reading`, `motion.easeOut`). Numbers swap without animation, so they are always exact.
- **The timer ticks locally** every second between reports, then resyncs to `curCookSec`.
- **Sheets rise** 420 ms from the bottom over a 240 ms scrim fade. Segmented thumbs slide with a slight spring (380 ms).
- **Presses** scale to 0.97 in 120 ms.
- With reduce motion on (`useReducedMotion()`), everything is instant and the heartbeat is a colour change only.

## Iconography

A custom 24px stroke set ([src/ui/Icon.tsx](../src/ui/Icon.tsx)), 1.75px strokes with round caps and joins, drawn for Searly with `react-native-svg`. Names: `bluetooth`, `bluetooth-off`, `bolt`, `probe`, `dock`, `thermometer`, `timer`, `volume`, `volume-low`, `volume-quiet`, `mute`, `sliders`, `check`, `check-circle`, `alert`, `info`, `close`, `chevron-right`, `chevron-down`, `plus`, `minus`, `refresh`, `unlink`, `terminal`, `cloud-off`, `phone`, `pencil`, `copy`, `search`, `settings`, `lock`. Icons take their colour from the caller. No emoji anywhere.

## The probe

The probe has six sensors. Five sit inside the shaft at evenly spaced points: **T1** just behind the tip, **T5** at the neck where the shaft thickens. The G1 reports them tip first in `areaTemperature`, and the lowest is the core (`curTemperature`). The sixth, **ambient**, is in the cap end, which stays outside the food, so it reads the oven or grill air (`curAmbientTemperature`).

Drawings of the probe keep its real proportions (`PROBE` in `ProbeZones.tsx`): the thick part (lower steel, black band, upper steel, rim) is about 37% of its length, then a short taper to a thin shaft about 40% as wide, which runs to the pointed tip.

## The G1 illustration

`DeviceG1` draws the G1 from rounded rectangles and circles so setup can show exactly what to look at: the docked probe, the LCD reading OFF, the OK key pulsing, the Bluetooth symbol flashing. Its LCD uses seven-segment glyphs with ghosted unlit segments like the real screen. It is a simplified drawing, not a reproduction: never place ThermoMaven's logo, artwork or product photos in Searly, and only show LCD states that have been seen on hardware. The G1 shows OFF while the probe is docked and switches to its temperature view (the reading, then Target | Ambient) the moment the probe comes out, whether or not a phone is connected. Never imply the screen waits for Searly.

## Screens

The root component switches on the session state from the [spec](SPEC.md). Each state has one screen:

| State | Screen | Primary action |
| --- | --- | --- |
| No identity | Welcome, then pairing steps 1 and 2 | Pair a G1, Start pairing |
| Pairing, waiting for OK | Step 2 with a 35 s countdown | Cancel |
| Scanning, connecting, trusting | Searching, with the retry schedule | Try now |
| Live, probe docked | Live, dial dotted, "Docked, charging" | Start cook (disabled with a reason) |
| Live, probe out, no cook | Ready: live reading, neutral sensors | Start cook |
| Live, cooking | Core, degrees to go, sensors on the heat ramp | Change target |
| Live, core at or over target | At target: ring closed, chip cyan | Change target |
| Live, no report for 6 s | Live, reading greyed, "No data for N s" | Try now |
| Needs re-pair (cmdError 11) | Not recognised | Pair again |
| Bluetooth off, permission denied | Recovery states | Turn on Bluetooth, Open Settings |

The live screen holds, top to bottom: the cook chip and timer, the heat dial, at most one notice, the probe card (sensors and ambient), and the batteries. Target is read from the dial and changed with the bottom button; ambient is read from the probe card.

When the probe or the G1 is at 20% battery or less, a warn notice names which one and its level, under the dial. Only one notice shows at a time: no data beats low battery.

The debug log opens with a long press on the live screen's title. It is for hardware testing; nothing else in the UI points to it except a footnote in Settings.

## Units

The wire is always integer tenths of a degree Fahrenheit. Convert only at the UI edge, and show the unit the person chose in Settings. That setting is local: the G1's own screen keeps its unit, and Settings says so.

## Where things live

| What | Where |
| --- | --- |
| Tokens, type scale, motion, `heatStep()` | [src/ui/theme.ts](../src/ui/theme.ts) |
| Heat dial, probe zones, G1 drawing, target picker, `Temp`, icons | `src/ui/` (one file each) |
| Buttons, segmented control | [src/ui/controls.tsx](../src/ui/controls.tsx) |
| Screen, sheet, list rows, wordmark | [src/ui/layout.tsx](../src/ui/layout.tsx) |
| Connection pill, batteries, cook status, notices, apply receipt, retry schedule | [src/ui/status.tsx](../src/ui/status.tsx) |
| Screens and sheets | `src/screens/` |

Change a token in `theme.ts`, not at the call site, and keep the copy, sizes and states in this file in step with the code.
