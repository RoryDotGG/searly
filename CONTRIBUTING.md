# Contributing to Searly

Thanks for helping. Searly is small on purpose: an offline app that does a few things for the G1 and
does them reliably. Open an issue before starting anything large so the scope can be agreed first.

## Set up

1. Install Node 22.13 or later, [uv](https://docs.astral.sh/uv/) and Android Studio.
2. Run `npm ci`.
3. Run `npx expo run:android` with an Android phone plugged in. The emulator has no Bluetooth, and
   Expo Go cannot load the Bluetooth module.

`android/` and `ios/` are generated. Never edit them; configure native behaviour in `app.json` and
config plugins, then rebuild.

## Checks

CI runs these on every pull request. Run them before you push:

```bash
npx tsc --noEmit
npm test
cd experiments/python && uv run g1.py test
```

## Protocol changes

Hardware is the source of truth. Try a protocol idea with
[experiments/python/g1.py](experiments/python/g1.py) on a real G1 first, then port it to
`src/protocol`. Write down what you saw in [docs/PROTOCOL.md](docs/PROTOCOL.md), tagged **[HW]** if
you saw it on hardware or **[APK]** if you only read it from the official app.

If you change framing in `g1.py`, regenerate the app's test fixtures and commit them:

```bash
cd experiments/python && uv run g1.py fixtures > ../../src/protocol/fixtures.json
```

`src/protocol` stays pure TypeScript with no React Native imports, so vitest can run it in Node.

## UI and copy

- No navigation library. The root component switches on connection state; cook and settings are
  bottom sheets (`Modal`).
- Use the tokens in [src/ui/theme.ts](src/ui/theme.ts). Ember (`sear`) is heat and the one primary
  action, cyan (`signal`) means the G1 confirmed something, amber (`warn`) needs the person's
  attention.
- Copy is UK English, sentence case, short sentences. No exclamation marks, no emoji, no error codes
  outside the debug log. Buttons start with a verb and say what will happen: "Start Manual cook at
  65°".
- Never use ThermoMaven's logo, artwork or product photos.

## Reporting a bug or a new device

Use the [issue form](https://github.com/RoryDotGG/searly/issues/new?template=bug.yml). The debug
log helps most: long-press the title on the live screen, then tap Copy log. It records command names
and receipts, not the pairing identity, but read it before posting.

## Pull requests

- One logical change per pull request, with a short imperative title.
- Say how you tested it, and on which phone and G1 firmware if it touches Bluetooth.
- By contributing, you agree your work is released under the [MIT licence](LICENSE).
