// Release builds talk only to the G1, so they drop INTERNET and the template's other defaults.
// Debug builds keep them: Metro needs INTERNET. A release-only manifest outranks the main one in
// the manifest merger, so tools:node="remove" here leaves debug builds untouched.
const fs = require("node:fs");
const path = require("node:path");
const { withDangerousMod } = require("expo/config-plugins");

const REMOVED = [
  "android.permission.INTERNET",
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
];

const manifest = `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">
${REMOVED.map((name) => `    <uses-permission android:name="${name}" tools:node="remove" />`).join("\n")}
</manifest>
`;

module.exports = (config) =>
  withDangerousMod(config, [
    "android",
    (config) => {
      const dir = path.join(config.modRequest.platformProjectRoot, "app/src/release");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "AndroidManifest.xml"), manifest);
      return config;
    },
  ]);
