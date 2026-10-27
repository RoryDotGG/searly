# Searly

Your ThermoMaven G1, without the cloud.

Searly talks to the ThermoMaven G1 wireless meat thermometer directly over Bluetooth. No account,
no Wi-Fi, no tracking, no app store. It is the groundwork for a small, fast, offline FOSS app.

> Unofficial. Not affiliated with or endorsed by ThermoMaven, Typhur or Auros.

## What works

| Feature | Status |
|---|---|
| Pair with a G1 (no account) | Works |
| Reconnect without pressing a button | Works |
| Live probe temperature, 5 zones, ambient, batteries (every 2 s) | Works |
| Start a Manual or Smart cook, change the target | Works |
| Device settings (volume) | Works |
| Stop or finish a cook over Bluetooth | The G1 ignores it while the probe is out; docking ends the cook |
| Smart mode ETA and "remove now" / resting / ready states | Not yet observed |

Tested against one G1 on firmware 25. Other ThermoMaven models (P1, P2, G2, G4) appear to share the
protocol with a different model code, but are untested.

## Repo layout

| Path | What |
|---|---|
| `/` | The Android app (Expo / React Native). Planned in [docs/SPEC.md](docs/SPEC.md); so far pairing and a live screen that reconnects by itself |
| `docs/PROTOCOL.md` | The reverse-engineered BLE protocol |
| `experiments/python/` | Python reference client used to work out the protocol |

## App (in progress)

Needs Node 22+, Android Studio's SDK and an Android phone with Bluetooth (the emulator has none).

```bash
npm install
npx expo run:android
```

## Python client quick start

Needs [uv](https://docs.astral.sh/uv/) and Bluetooth. Run from `experiments/python`.

1. Put the probe in the dock.
2. `uv run g1.py pair`, then press **OK** on the G1 when the Bluetooth icon flashes.
3. `uv run g1.py watch`

```text
base bat 83% | probe1 cooking 23.7°C ambient 24.3°C bat 100%
```

Send any command: `uv run g1.py send WT10:setting:modify '{"volume":"mute"}'`.
Offline self-check: `uv run g1.py test`.

On **macOS** run it through `./macos-run.sh watch` instead. macOS only lets an app with a
Bluetooth usage description use Bluetooth, so the script wraps the client in a tiny local `.app`.

Pairing makes this client the G1's owner. To go back to the official app, pair from there again.

## How it works

The G1 handset is an ESP32 that exposes Espressif BluFi. Commands are zstd-compressed JSON wrapped
in BluFi custom-data frames, the same messages the official app sends through the cloud. The full
write-up, including what was verified on hardware and what was only read from the app, is in
[docs/PROTOCOL.md](docs/PROTOCOL.md).

## Credits

- [kingchddg901/ha-thermomaven](https://github.com/kingchddg901/ha-thermomaven): cloud protocol and
  JSON field meanings.
- [zuyan9/ha-typhur-thermomaven-ble](https://github.com/zuyan9/ha-typhur-thermomaven-ble): first
  public hint that the BLE side is BluFi plus zstd JSON.

## Licence

[MIT](LICENSE)
