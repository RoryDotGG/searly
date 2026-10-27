# ThermoMaven G1 (WT10) BLE protocol

Reverse engineered on 2026-10-27 against a real G1 (firmware `appVersion` / `controlBoardVersion` 25)
and the official Android app `com.auros.thermomaven` (web bundle 1.9.10). Everything marked
**[HW]** was observed on the device. **[APK]** means it was read from the app but not yet exercised.

The whole thing works offline. No account, no cloud, no Wi-Fi. Reference client: [g1.py](../experiments/python/g1.py).

## Topology

```
probe --Sub-1GHz--> G1 handset (ESP32) --BLE--> phone / this client
                                       \--Wi-Fi--> AWS IoT (optional, ignored here)
```

The G1 handset has a screen and four buttons: SET (top left), OK (bottom left), up/down rocker.

## 1. Discovery [HW]

| Item | Value |
|---|---|
| Name | `TM-WT10-<4 chars>` |
| Advertised service | `0xFFFF` |
| Manufacturer data | company `0x5707`, ASCII `TA` + 12 hex chars (BT MAC) + `CNA`, then 7 bytes |
| GATT | service `0000ffff-…`: `ff01` write (with response), `ff02` notify |
| MTU | 500 (macOS; Android 17 on a Pixel 10 Pro XL). Notifications are at most 250 bytes |

This is stock Espressif **BluFi**, reused as a message pipe.

## 2. BluFi framing [HW]

```
| type u8 | frame_ctrl u8 | seq u8 | len u8 | data[len] |
```

- Only one frame type is used: `type = 0x4D` (data frame, subtype 19 "custom data").
- `seq` counts from 0 per direction per link. The G1 **enforces** the phone-to-G1 count [HW]: a
  frame with the wrong `seq` is answered with an error frame `49 04 <seq> 01 00` (data subtype 18,
  error 0 = sequence error) and the count does not advance. Android can hand a hard-killed app's
  link to the next process, so the G1 keeps counting from the old session. Recover by sending
  "get version" control frames (`1C 00 <seq> 00`) with seq 0, 1, 2… until one is answered with
  the version (`41 …`) instead of an error; the next frame is that seq + 1.
- `frame_ctrl`: `0x10` = more fragments follow; `0x04` set on device-to-phone frames.
  No encryption (`0x01`) and no checksum (`0x02`) needed. The G1 never asked for DH negotiation.
- `len` is one byte, so payloads over 255 bytes must fragment. A fragment's `data` starts with
  a u16 LE "total bytes remaining", then the chunk. The final fragment has no prefix and no `0x10`.

## 3. Payload envelope [HW]

Inside the reassembled `0x4D` data:

```
AA AA | comp_len u16 | raw_len u16 | zstd(json)[comp_len] | crc_a u16 | crc_b u16      (LE)
crc_a = CRC-16/XMODEM (poly 0x1021, init 0) over comp_len..end of zstd
crc_b = CRC-16/XMODEM over the uncompressed JSON
```

Both CRCs verified on every received frame (0 failures over ~60 messages).

The G1 also accepts a zstd frame holding one uncompressed ("raw") block, so a sender needs no
zstd compressor: `28 B5 2F FD | A0 | content size u32 | (len << 3 | 1) u24 | json` (LE). Checked
with `g1.py --raw`: `BT:apply:trust` (direct) and `WT10:setting:modify` both returned success.

## 4. JSON messages [HW]

Phone to G1:

```json
{"cmdId": "<32 hex>", "cmdSeqNo": 1, "cmdType": "...", "cmdData": {},
 "deviceId": "<paired deviceId, or \"\" when pairing>", "deviceType": "WT10",
 "protocol": "BT", "serverTime": 1793124978000, "serverTimeSecond": 1793124978}
```

G1 to phone adds `deviceTimeSecond`, `userId` (the trusted user, `""` before trust),
`appVersion`, `controlBoardVersion`. `cmdSeqNo` is a string and survives reconnects.

Every command gets a `device:cmd:receipt`:

```json
{"cmdId": "<our cmdId>", "cmdType": "<our cmdType>", "executeResult": "success" | "failure",
 "errorCode": 0, "cmdError": 10, "deviceStatus": "normal", "volume": "mute",
 "screenSleepTime": 300, "screenBrightness": "high", "readyNotification": 3}
```

## 5. Pairing and trust [HW]

Until trusted, the G1 drops nearly every command silently. `BT:Probe:Request` is the only
command seen to get a receipt while untrusted.

### First time (`mode: "pair"`)

1. **Dock the probe.**
2. Send `BT:apply:trust`, `deviceId: ""`:
   `{"userId", "deviceModel", "mode": "pair", "lengthUnit", "temperatureUnit", "weightUnit"}`
3. Receipt `cmdError: 10` arrives at once = waiting for the user. The Bluetooth icon flashes.
4. User presses **OK** within 30 s (SET declines). Receipt `executeResult: "success"`.
   Timeout, decline or probe out of the dock gives `cmdError: 11`.
5. Send `BT:Pair:Result` `{"result": "success"}` with the envelope `deviceId` set to the
   ID the G1 should remember. The official app uses the deviceId from its cloud bind call.
   Any 18-digit string works offline. Receipt `success`; `userId` now shows the new owner.

Skipping step 5 gives a trusted session that never streams data, and trust is lost on disconnect.
After step 5, status reports start in the same session with no `direct` trust needed [HW].

### Every later connection (`mode: "direct"`)

Send `BT:apply:trust` with `mode: "direct"`, the **same `userId`**, and the stored `deviceId`
in the envelope. Instant `success`, no button. A different userId gets `cmdError: 11`.

Untested: whether pairing a second user evicts the first, or the G1 keeps several owners.
`BT:user:unbind` (empty cmdData) exists to release the device [APK].

### Error codes

| cmdError | Meaning |
|---|---|
| 10 | Awaiting OK on the device (not a failure) |
| 11 | Refused: not the owner, declined, timed out, or probe not docked |
| 4 | Cooking action not valid in the current cook state (Finish while cooking) |
| 6 | Setting value not accepted (`volume: "quiet"`) [HW] |

## 6. Live data [HW]

After a trusted `direct` session starts, the G1 pushes `WT10:status:report` every **2.0 s**
while a probe is out of the dock, and every **10 s** when all probes are docked, with no request
needed (`device:status:request` gets no reply).

```json
{"globalStatus": "online", "batteryStatus": "normal", "batteryValue": 83, "wifiRssi": -35,
 "volume": "mute", "connectStatus": "bt", "hasWifiConfig": false,
 "probes": [{"deviceSn": "WPGB<14 chars>", "probeColor": "probe1",
             "cookingState": "cooking", "cookingMode": "manual", "cookUuid": "<hex>",
             "curTemperature": 758, "curAmbientTemperature": 754,
             "areaTemperature": [758, 761, 763, 763, 764],
             "setParams": [{"setTemperature": 1400}], "batteryValue": 100,
             "curCookSec": 12, "totalCookSec": 0}]}
```

- **Temperatures are tenths of a degree Fahrenheit**, whatever unit the trust or display uses.
  `758` = 75.8 °F = 24.3 °C. `setTemperature 1400` = 140 °F = 60 °C (matched the screen).
- `areaTemperature` = five zones, tip first. `curTemperature` = the lowest (core) zone.
- Docked probe collapses to `{probeColor, cookingState: "charged", cookingMode, setParams}`.
- `cookingState` seen: `charged`, `cooking`. App constants also list `ready`, `resting`, `remove`.
- Taking the probe out of the dock starts a Manual cook at the last target by itself [HW].
- Reports start within about 200 ms of a successful `direct` trust [HW].

## 7. Commands

| cmdType | cmdData | Status |
|---|---|---|
| `BT:apply:trust` | see section 5 | [HW] |
| `BT:Pair:Result` | `{"result": "success"}` | [HW] |
| `WT10:setting:modify` | one of `volume` (`high`/`medium`/`low`/`mute`), `screenBrightness`, `screenSleepTime`, `readyNotification`, `temperatureUnit`, `lengthUnit`, `weightUnit`, `language` | `volume` [HW], rest [APK] |
| `WT10:cooking:action` | see section 8 | start, change target [HW]; stop, finish [HW] but no effect while probe is out |
| `WT10:probe:search` | `{probeColor}` | [APK] |
| `WT10:alert:dismiss` | `{}` | [APK] |
| `BT:Probe:Request` / `:Pair` / `:Unpair` | `{}` | Request [HW] (receipt only) |
| `BT:WIFI:request` → `BT:WIFI:List` | `{}` → `[{SSID, rssi, connected, pwLen}]` | [APK], not needed offline |
| `BT:Config:WIFI` | `{"SSID", "password"}` | [APK], not needed offline |
| `BT:user:unbind` | `{}` | [APK] |

`volume`: all four values give `success` and the next status report shows the new value [HW].
The official app's picker offers only `high`/`low`/`mute` [APK], and the G1's own menu only
Loud/Quiet/Mute [HW]. `medium` has no menu entry and seems to sound the same as `high`.
`quiet` (used by the cloud models in ha-thermomaven) gets `failure`, `cmdError: 6`, and the
volume does not change [HW].

Field semantics for cooking commands are documented from cloud captures in
[kingchddg901/ha-thermomaven docs/PROTOCOL.md](https://github.com/kingchddg901/ha-thermomaven/blob/main/docs/PROTOCOL.md);
over BT the same JSON travels in the envelope above.

## 8. Cooking control [HW]

All via `WT10:cooking:action`, probe out of the dock. Tested with a manual cook.

```json
{"probeColor": "probe1", "cookingAction": 1, "cookingMode": "manual", "cookUuid": "<32 hex>",
 "startClient": "android", "setParams": [{"setTemperature": 1400}],
 "cookingData": {"dataType": "manual", "dataId": "", "dataName": "Manual cook", "dataImgUrl": ""}}
```

| Action | How | Result on the G1 |
|---|---|---|
| Change target | `1` with the **running** `cookUuid` and its `startClient`; `cookingData: null` if `startClient` is `device` | Applied in about 0.1 s. Same cook, timer keeps counting |
| Start new cook | `1` with a **new** `cookUuid` | Replaces the running cook. Timer resets to 0, `startClient` becomes ours |
| Stop | `2` + `cookUuid` | Receipt `success` but **no change**: still `cooking` |
| Start while docked | `1` with a new `cookUuid` | Receipt `success` but **no change**: still `charged` |
| Finish | `5` + `cookUuid` | `failure`, `cmdError: 4`; still `cooking` |
| Resting | `4` + `cookUuid` | Not tested. Only valid with a rest target [APK] |

### Smart vs Manual

Same command, only `cookingMode` changes. A Smart start is `cookingMode: "smart"` with a single
`setTemperature` (the final eating temperature) [HW]. The app's own descriptions [APK]:

- **Manual**: set a target, get an alert when it's reached.
- **Smart**: alerts you to take food off the heat a few degrees early (carryover during resting),
  then tells you when it's ready to eat.

The early-removal maths runs on the G1: the app sends nothing extra. `cookingData` only labels the
cook: `{"dataType": "manual", "dataName": "Smart cook"}` for a plain Smart cook,
`dataType: "guide"` + `dataId` (doneness guide ID) for meat/doneness picks, `recipe` /
`ai_recipe` for recipes, which may add `setDonenessC` / `setDonenessF` to `setParams[0]` [APK].

At room temperature a Smart cook reports exactly the same fields as Manual, with
`curRemainedSec: null` [HW]. The Smart-only behaviour (ETA in `curRemainedSec`, `cookingState`
moving through `remove` / `resting` / `ready`) needs a rising temperature and is not yet observed.

Full probe object while cooking also carries `curRawAmbientTemperature` and a 7-element
`temperaturePercentile` (meaning unknown) [HW].

### Ending a cook

So with the probe out of the dock, a cook can't be ended over BT. Treat the receipt as
unreliable for stop: watch `cookingState` in the next status reports. Docking the probe ends the
cook (`charged`). Cook state lives on the G1 and survives BLE reconnects.

## 9. macOS note

CoreBluetooth kills any process whose responsible app lacks `NSBluetoothAlwaysUsageDescription`
(SIGABRT, TCC crash report). Run Python from a tiny `.app` bundle whose `Info.plist` has that key
and launch it with `open`, or ship the real app as a signed bundle. Terminal.app alone was not enough.

## Still to verify

1. Whether stop/finish take effect once the probe is in meat, after the target is reached
   (`ready`), or only on docking. Resting (action 4) with a rest target
2. Smart mode state transitions and ETA under real heating
2. Remaining `setting:modify` fields and their accepted values
3. Behaviour of the multi-probe variant (`probesIconMap` key `C`) and alert pushes
4. Whether `BT:user:unbind` fully releases the device
