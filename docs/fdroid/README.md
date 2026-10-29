# F-Droid

[gg.rory.searly.yml](gg.rory.searly.yml) is the recipe for
[fdroiddata](https://gitlab.com/fdroid/fdroiddata), as `metadata/gg.rory.searly.yml`. Keep it in
`fdroid rewritemeta` form with no comments: fdroiddata CI fails on any rewritemeta diff. The notes
live here instead.

- Node 22 comes from nodejs.org in `sudo`, pinned by SHA-256.
- `prebuild` generates `android/` and drops the debug signing config so Gradle emits an unsigned
  release APK.
- `rm -r node_modules/expo-modules-core/android/prebuilt` removes a prebuilt `.so` archive the
  scanner does not flag; with it gone, `-Pexpo.core.buildFromSource=true` builds from source.
- `scanignore`: the Gradle files only declare local Maven repos (deleting them breaks the build),
  and Hermes binaries are allowed by the inclusion policy.
- `UpdateCheckData` reads the versions from `app.json`, because `android/` is generated.
- The store listing lives in [fastlane/metadata/android](../../fastlane/metadata/android). F-Droid
  reads it from the latest release only, so changes ship with the next tag.

## Releasing

1. Bump `version` in `app.json` and `package.json`, and `android.versionCode` in `app.json`.
2. Add `fastlane/metadata/android/en-US/changelogs/<versionCode>.txt` (500 characters at most).
3. Merge, then push a `v<version>` tag. F-Droid's checkupdates picks it up.
