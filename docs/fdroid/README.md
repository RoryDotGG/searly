# F-Droid

[gg.rory.searly.yml](gg.rory.searly.yml) is the recipe for
[fdroiddata](https://gitlab.com/fdroid/fdroiddata), as `metadata/gg.rory.searly.yml`. fdroiddata CI
fails on any `fdroid rewritemeta` diff, and rewritemeta strips comments, so the file has none and
these notes explain it.

- Node 22 comes from nodejs.org in `sudo`, pinned by SHA-256.
- `prebuild` generates `android/` and drops the debug signing config so Gradle emits an unsigned
  release APK.
- `rm -r node_modules/expo-modules-core/android/prebuilt` removes a prebuilt `.so` archive the
  scanner does not flag; with it gone, `-Pexpo.core.buildFromSource=true` builds from source.
- F-Droid's build server only has JDK 21, so the second `sed` moves the JDK 17 toolchain pins in
  React Native's Gradle plugin and Expo's KSP config to 21.
- `commit` is the release's full hash, not the tag: fdroiddata review asks for that.
- `scanignore`: the Gradle files only declare local Maven repos (deleting them breaks the build),
  and Hermes binaries are allowed by the inclusion policy.
- `UpdateCheckData` reads the versions from `app.json`, because `android/` is generated.
- The store listing lives in [fastlane/metadata/android](../../fastlane/metadata/android). F-Droid
  reads it from the latest release only, so changes ship with the next tag.

## Releasing

1. Bump `version` in `app.json`, `package.json` and `package-lock.json`, and `android.versionCode`
   in `app.json`.
2. Add `fastlane/metadata/android/en-US/changelogs/<versionCode>.txt` (500 characters at most).
3. Merge, then push a `v<version>` tag. F-Droid's checkupdates finds the tag and adds the build,
   and [release.yml](../../.github/workflows/release.yml) builds the APK on EAS and publishes it as
   a GitHub release with the changelog as its notes.
