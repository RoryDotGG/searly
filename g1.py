# /// script
# requires-python = ">=3.12"
# dependencies = ["bleak==3.0.2", "zstandard==0.25.0"]
# ///
"""Offline ThermoMaven G1 (WT10) client over BLE. No cloud, no account.

    uv run g1.py pair            # first time: dock probe, press OK on the G1 when the BT icon flashes
    uv run g1.py watch           # stream status reports (trusted reconnect, no button)
    uv run g1.py send TYPE JSON  # e.g. send WT10:setting:modify '{"volume":"mute"}'
    uv run g1.py test            # offline self-check of the framing

Identity (userId/deviceId) is kept in g1-identity.json beside this file.
"""
import asyncio, json, pathlib, secrets, struct, sys, time, uuid

import zstandard as zstd
from bleak import BleakClient, BleakScanner

WRITE, NOTIFY = "0000ff01-0000-1000-8000-00805f9b34fb", "0000ff02-0000-1000-8000-00805f9b34fb"
CUSTOM = (19 << 2) | 1  # BluFi data frame, subtype 19 "custom data" = 0x4D
FC_FRAG = 0x10
MODEL = "WT10"
IDENTITY = pathlib.Path(__file__).with_name("g1-identity.json")


def crc16_xmodem(b, crc=0):
    for x in b:
        crc ^= x << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF if crc & 0x8000 else (crc << 1) & 0xFFFF
    return crc


def pack(obj):
    raw = json.dumps(obj, separators=(",", ":")).encode()
    comp = zstd.ZstdCompressor(level=3).compress(raw)
    body = struct.pack("<HH", len(comp), len(raw)) + comp
    return b"\xaa\xaa" + body + struct.pack("<HH", crc16_xmodem(body), crc16_xmodem(raw))


def unpack(p):
    if p[:2] != b"\xaa\xaa":
        raise ValueError(f"bad magic {p[:8].hex()}")
    clen, rlen = struct.unpack_from("<HH", p, 2)
    body, crcs = p[2:6 + clen], struct.unpack_from("<HH", p, 6 + clen)
    raw = zstd.ZstdDecompressor().decompress(body[4:], max_output_size=rlen)
    if crcs != (crc16_xmodem(body), crc16_xmodem(raw)):
        raise ValueError("crc mismatch")
    return json.loads(raw)


def frames(seq, data, chunk=253):
    """Split one BluFi custom-data payload into frames. The length field is one byte, so cap at 255."""
    out = []
    while True:
        last = len(data) <= chunk
        body = data if last else struct.pack("<H", len(data)) + data[:chunk]
        out.append(bytes([CUSTOM, 0 if last else FC_FRAG, seq & 0xFF, len(body)]) + body)
        seq += 1
        if last:
            return out, seq
        data = data[chunk:]


class G1:
    def __init__(self, client, device_id=""):
        self.c, self.device_id = client, device_id
        self.seq, self.cmd_seq, self.rx, self.q = 0, 0, bytearray(), asyncio.Queue()

    async def start(self):
        await self.c.start_notify(NOTIFY, self._on_notify)

    def _on_notify(self, _, d):
        t, fc, _seq, n = d[:4]
        payload = d[4:4 + n]
        if fc & FC_FRAG:
            self.rx += payload[2:]  # first 2 bytes: total bytes remaining
            return
        full, self.rx = bytes(self.rx + payload), bytearray()
        if t == CUSTOM:
            try:
                self.q.put_nowait(unpack(full))
            except ValueError as e:
                print(f"drop frame: {e}", file=sys.stderr)

    async def send(self, cmd_type, data=None):
        self.cmd_seq += 1
        now = int(time.time())
        obj = {"cmdId": uuid.uuid4().hex, "cmdSeqNo": self.cmd_seq, "cmdType": cmd_type, "cmdData": data or {},
               "deviceId": self.device_id, "deviceType": MODEL, "protocol": "BT",
               "serverTime": now * 1000, "serverTimeSecond": now}
        pkts, self.seq = frames(self.seq, pack(obj))
        for p in pkts:
            await self.c.write_gatt_char(WRITE, p, response=True)
        return obj["cmdId"]

    async def receipt(self, cmd_id, timeout):
        """Wait for the receipt of cmd_id, returning its cmdData; other messages are printed."""
        end = time.monotonic() + timeout
        while (left := end - time.monotonic()) > 0:
            try:
                msg = await asyncio.wait_for(self.q.get(), left)
            except asyncio.TimeoutError:
                break
            cd = msg.get("cmdData") or {}
            if msg["cmdType"] == "device:cmd:receipt" and cd.get("cmdId") == cmd_id:
                if cd.get("cmdError") != 10:  # 10 = waiting for OK on the device
                    return cd
                print("press OK on the G1 (probe must be docked)")
            else:
                show(msg)
        return {"executeResult": "timeout"}

    async def trust(self, ident, mode):
        cid = await self.send("BT:apply:trust", {"userId": ident["userId"], "deviceModel": "g1.py", "mode": mode,
                                                 "lengthUnit": "cm", "temperatureUnit": "C", "weightUnit": "g"})
        return await self.receipt(cid, 35)


def show(msg):
    if not msg["cmdType"].endswith(":status:report"):
        print(json.dumps(msg))
        return
    d = msg["cmdData"]
    probes = []
    for p in d.get("probes", []):
        if "curTemperature" in p:  # temps are tenths of a degree F
            c = lambda v: f"{(v / 10 - 32) * 5 / 9:.1f}°C"
            probes.append(f"{p['probeColor']} {p['cookingState']} {c(p['curTemperature'])} "
                          f"ambient {c(p['curAmbientTemperature'])} bat {p.get('batteryValue')}%")
        else:
            probes.append(f"{p['probeColor']} {p['cookingState']}")
    print(f"base bat {d.get('batteryValue')}% | " + " | ".join(probes))


async def connect():
    dev = await BleakScanner.find_device_by_filter(lambda d, a: (a.local_name or "").startswith("TM-WT10"), timeout=20)
    if not dev:
        sys.exit("G1 not found")
    return BleakClient(dev)


async def main(argv):
    cmd = argv[0] if argv else "watch"
    if cmd == "pair":
        ident = {"userId": str(secrets.randbelow(9 * 10**17) + 10**17),
                 "deviceId": str(secrets.randbelow(9 * 10**17) + 10**17)}
        async with await connect() as c:
            g = G1(c)
            await g.start()
            if (r := await g.trust(ident, "pair")).get("executeResult") != "success":
                sys.exit(f"pairing failed: {r}")
            g.device_id = ident["deviceId"]  # the device stores this from the Pair:Result envelope
            r = await g.receipt(await g.send("BT:Pair:Result", {"result": "success"}), 10)
            if r.get("executeResult") != "success":
                sys.exit(f"commit failed: {r}")
        IDENTITY.write_text(json.dumps(ident))
        print(f"paired; identity saved to {IDENTITY}")
        return
    ident = json.loads(IDENTITY.read_text())
    async with await connect() as c:
        g = G1(c, ident["deviceId"])
        await g.start()
        if (r := await g.trust(ident, "direct")).get("executeResult") != "success":
            sys.exit(f"not trusted (re-run pair): {r}")
        if cmd == "send":
            print(json.dumps(await g.receipt(await g.send(argv[1], json.loads(argv[2])), 10)))
        while cmd == "watch":
            show(await g.q.get())


def test():
    msg = {"cmdType": "x", "cmdData": {"t": 1}}
    assert unpack(pack(msg)) == msg
    assert crc16_xmodem(b"123456789") == 0x31C3  # CRC-16/XMODEM check value
    big = pack({"pad": secrets.token_hex(400)})  # incompressible, so it must fragment
    pkts, seq = frames(0, big)
    assert seq == len(pkts) > 1 and all(len(p) <= 259 for p in pkts)
    assert b"".join(p[6:] if p[1] & FC_FRAG else p[4:] for p in pkts) == big
    print("ok")


if __name__ == "__main__":
    test() if sys.argv[1:2] == ["test"] else asyncio.run(main(sys.argv[1:]))
