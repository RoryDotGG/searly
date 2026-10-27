Searly is an offline Expo / React Native app (Android first) that controls a ThermoMaven G1 over
Bluetooth. Read [docs/SPEC.md](docs/SPEC.md) for the plan and [docs/PROTOCOL.md](docs/PROTOCOL.md)
for the wire protocol. [experiments/python/g1.py](experiments/python/g1.py) is the working
reference client: port from it, and use it to test protocol ideas on hardware before writing app code.

## Layout

- Repo root: the Expo app (`App.tsx`, `index.ts`, `app.json`, later `src/`)
- `docs/`: protocol notes and the app spec
- `experiments/`: hardware experiments, kept for reference. Not part of the app build

## Expo has changed: do not trust your training data

Expo ships breaking changes every SDK release. Before writing code that touches an Expo, EAS or
React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt and follow its links. Never answer from memory.

## Commands

```bash
npx expo install <package>  # use instead of npm install <package>: resolves SDK-compatible versions
npx expo run:android        # build and run a development build (Expo Go cannot load the BLE module)
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
uv run experiments/python/g1.py test   # offline protocol self-check
```

Run the typecheck before declaring any task done.

## Rules

- No navigation library: the root component switches on connection state and uses `Modal`s (see
  the spec). Add Expo Router only if the app outgrows that.
- `src/protocol` stays pure TypeScript with no React Native imports, so vitest can run it in Node.
- `ios/` and `android/` are generated (Continuous Native Generation). Never edit them by hand;
  configure native behaviour in `app.json` and config plugins.
- After adding a library with native code, rebuild the development build.
