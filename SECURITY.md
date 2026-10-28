# Security

Report vulnerabilities privately through
[GitHub's private vulnerability reporting](https://github.com/RoryDotGG/searly/security/advisories/new),
not in a public issue. Include the steps to reproduce and the phone, Android version and G1 firmware
you used.

## What counts

Searly has no server or account and makes no network requests, so most issues will be on the phone
or over Bluetooth. In scope:

- Anything that exposes the pairing identity (`userId`, `deviceId`). Anyone holding it can control
  the G1, so Searly keeps it in the phone's secure storage and never logs it.
- A way for a nearby Bluetooth device to make Searly crash, hang or show false readings.
- Searly sending data off the phone.

The G1's own Bluetooth security belongs to ThermoMaven. Report weaknesses in the device itself to
them; a note here is welcome too if it changes how Searly should behave.
