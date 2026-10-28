<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/searly-lockup-dark.svg">
    <img src="docs/brand/searly-lockup-light.svg" alt="Searly" width="300">
  </picture>
</p>

<p align="center"><strong>Your ThermoMaven G1, without the cloud.</strong></p>

<p align="center">
  <a href="https://github.com/RoryDotGG/searly/actions/workflows/ci.yml"><img src="https://github.com/RoryDotGG/searly/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/licence-MIT-ff6436" alt="Licence: MIT"></a>
  <img src="https://img.shields.io/badge/platform-Android-5ccfee" alt="Platform: Android">
</p>

Searly is a free, offline Android app for the ThermoMaven G1 wireless meat thermometer. It talks to
the G1 directly over Bluetooth: no account, no cloud, no Wi-Fi setup, no analytics.

Pair once, prop your phone up in the kitchen and read the core temperature from across the room.
Start a Manual or Smart cook, change the target and set the volume, all without the official app.

> [!NOTE]
> Unofficial. Not affiliated with or endorsed by ThermoMaven, Typhur or Auros. "ThermoMaven" and
> "G1" are their trademarks and are used here only to say what Searly works with.

## What works

| Feature | Status |
|---|---|
| Pair with a G1 (no account) | Works |
| Reconnect without pressing a button | Works |
| Live probe temperature, 5 zones, ambient, batteries (every 2 s; 10 s when docked) | Works |
| Start a Manual or Smart cook, change the target | Works |
| Device settings (volume) | Works |
| Stop or finish a cook over Bluetooth | The G1 ignores it while the probe is out; docking ends the cook |
| Smart mode ETA and "remove now" / resting / ready states | Not yet observed |
| Background monitoring and notifications | Planned, see [docs/SPEC.md](docs/SPEC.md) |

Tested on a Pixel 10 Pro XL (Android 17) with one G1 on firmware 25. Other ThermoMaven models (P1,
P2, G2, G4) appear to share the protocol with a different model code, but are untested. If you have
one, a [device report](https://github.com/RoryDotGG/searly/issues/new?template=bug.yml) helps.

## Install

There is no store release yet. Build it yourself:

1. Install Node 22.13 or later, and Android Studio for its SDK.
2. Clone this repo and run `npm ci`.
3. Plug in an Android phone with USB debugging on (the emulator has no Bluetooth).
4. Run `npx expo run:android`.

Expo Go cannot load the Bluetooth module, so this builds a development build.

## Python client

[experiments/python/g1.py](experiments/python/g1.py) is the reference client the protocol was worked
out with. It runs on any computer with Bluetooth and [uv](https://docs.astral.sh/uv/). From
`experiments/python`:

1. Put the probe in the dock.
2. Run `uv run g1.py pair`, then press **OK** on the G1 when the Bluetooth icon flashes.
3. Run `uv run g1.py watch`.

```text
base bat 83% | probe1 cooking 23.7°C ambient 24.3°C bat 100%
```

Send any command with `uv run g1.py send WT10:setting:modify '{"volume":"mute"}'`, or run the
offline self-check with `uv run g1.py test`.

On **macOS**, run `./macos-run.sh watch` instead. macOS only lets an app with a Bluetooth usage
description use Bluetooth, so the script wraps the client in a tiny local `.app`.

Pairing makes this client, or Searly, the G1's owner. To go back to the official app, pair from there
again.

## How it works

The G1 handset is an ESP32 that exposes Espressif BluFi. Commands are zstd-compressed JSON wrapped in
BluFi custom-data frames, the same messages the official app sends through the cloud. The full
write-up, including what was verified on hardware and what was only read from the official app, is
in [docs/PROTOCOL.md](docs/PROTOCOL.md).

| Path | What |
|---|---|
| `App.tsx`, `src/` | The app (Expo / React Native). [docs/SPEC.md](docs/SPEC.md) has the plan and architecture |
| `src/protocol/` | Pure TypeScript framing and messages, tested with vitest against fixtures from `g1.py` |
| `docs/PROTOCOL.md` | The reverse-engineered BLE protocol |
| `experiments/python/` | The Python reference client |

## Contributing

Bug reports, device reports and pull requests are welcome. Start with
[CONTRIBUTING.md](CONTRIBUTING.md). For security issues, see [SECURITY.md](SECURITY.md).

## Credits

- [kingchddg901/ha-thermomaven](https://github.com/kingchddg901/ha-thermomaven): cloud protocol and
  JSON field meanings.
- [zuyan9/ha-typhur-thermomaven-ble](https://github.com/zuyan9/ha-typhur-thermomaven-ble): first
  public hint that the BLE side is BluFi plus zstd JSON.

## Licence

Searly is [MIT](LICENSE) licensed. The bundled Bricolage Grotesque and Instrument Sans fonts are
under the SIL Open Font License; their licences are in [assets/fonts](assets/fonts).
