// Byte-level checks against the Python reference client. Regenerate the fixtures with
// `uv run experiments/python/g1.py fixtures > src/protocol/fixtures.json`.
import { describe, expect, test } from "vitest";

import { allDocked, parseAdvert } from "./advert";
import { frames, Reassembler } from "./blufi";
import { crc16 } from "./crc";
import { pack, unpack } from "./envelope";
import fixtures from "./fixtures.json";
import { command, fromTenthsF, incoming, receiptError, setCook, statusReport, targetTenthsF, toTenthsF } from "./messages";

const hex = (s: string) => new Uint8Array(s.match(/../g)?.map((b) => parseInt(b, 16)) ?? []);
const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

function reassemble(hexFrames: string[]) {
  const r = new Reassembler();
  const out = hexFrames.map((f) => r.push(hex(f)));
  expect(out.slice(0, -1).every((p) => p === null)).toBe(true);
  return out.at(-1);
}

test("crc16 matches the CRC-16/XMODEM check value", () => {
  expect(crc16(new TextEncoder().encode("123456789"))).toBe(0x31c3);
});

describe.each(["command", "long"] as const)("%s: TS output is byte-identical to g1.py --raw", (name) => {
  const f = fixtures[name];

  test("pack", () => {
    expect(toHex(pack(f.obj))).toBe(f.packed);
  });

  test("frames, including fragment prefixes and seq wrap", () => {
    const seq = parseInt(f.frames[0]!.slice(4, 6), 16);
    const out = frames(seq, hex(f.packed));
    expect(out.frames.map(toHex)).toEqual(f.frames);
    expect(out.seq).toBe(seq + f.frames.length);
  });

  test("reassemble and unpack", () => {
    expect(unpack(reassemble(f.frames)!)).toEqual(f.obj);
  });
});

test("command() builds the same envelope as g1.py", () => {
  const { obj } = fixtures.command;
  const built = command(obj.cmdType, obj.cmdData, {
    cmdId: obj.cmdId,
    cmdSeqNo: obj.cmdSeqNo,
    deviceId: obj.deviceId,
    nowMs: obj.serverTime,
  });
  expect(toHex(pack(built))).toBe(fixtures.command.packed);
});

test("a fragmented, zstd-compressed status report decodes", () => {
  const msg = unpack(reassemble(fixtures.report.frames)!);
  expect(msg).toEqual(fixtures.report.obj);
  const report = statusReport(incoming(msg)!);
  expect(report?.batteryValue).toBe(83);
  expect(report?.probes.map((p) => [p.probeColor, p.cookingState, p.curTemperature])).toEqual([
    ["probe1", "cooking", 758],
    ["probe2", "charged", undefined],
  ]);
});

test("statusReport ignores other messages and malformed probes", () => {
  const m = (cmdType: string, cmdData: unknown) => ({ cmdId: "x", cmdType, cmdData });
  expect(statusReport(m("device:cmd:receipt", {}))).toBeNull();
  expect(statusReport(m("WT10:status:report", { probes: "nope" }))).toBeNull();
  expect(statusReport(m("WT10:status:report", { probes: [null, { probeColor: "p" }] }))?.probes).toEqual([]);
});

test("frames respect a small chunk", () => {
  const data = hex(fixtures.long.packed);
  const out = frames(0, data, 20);
  expect(out.frames.every((f) => f.length <= 4 + 2 + 20)).toBe(true);
  expect(reassemble(out.frames.map(toHex))).toEqual(data);
  expect(() => frames(0, data, 254)).toThrow(RangeError);
});

describe("bad input is rejected", () => {
  const packed = hex(fixtures.command.packed);

  test("a flipped JSON byte fails the CRC", () => {
    const bad = packed.slice();
    bad[30]! ^= 1;
    expect(() => unpack(bad)).toThrow(/crc/);
  });

  test("a truncated envelope", () => {
    expect(() => unpack(packed.subarray(0, 40))).toThrow(/truncated/);
  });

  test("bad magic", () => {
    expect(() => unpack(packed.subarray(1))).toThrow(/bad envelope/);
  });

  test("a notification shorter than its header, and recovery after it", () => {
    const r = new Reassembler();
    const [first, second] = fixtures.long.frames.map(hex);
    r.push(first!);
    expect(() => r.push(second!.subarray(0, 100))).toThrow(/truncated notification/);
    expect(reassemble(fixtures.command.frames)).toEqual(packed);
  });

  test("non-messages", () => {
    expect(incoming(null)).toBeNull();
    expect(incoming({ cmdType: 1, cmdId: "x" })).toBeNull();
  });
});

test("receiptError names the documented codes", () => {
  const r = { cmdId: "x", cmdType: "x", executeResult: "failure" };
  expect(receiptError({ ...r, cmdError: 11 })).toMatch(/refused/);
  expect(receiptError({ ...r, cmdError: 4 })).toMatch(/cook state/);
  expect(receiptError(r)).toMatch(/failure \(cmdError none\)/);
});

test("setCook: cookingData is null only for cooks started on the G1", () => {
  const base = { probeColor: "probe1", mode: "smart", targetTenthsF: 1400, cookUuid: "u" } as const;
  expect(setCook({ ...base, startClient: "android" }).cookingData?.dataName).toBe("Smart cook");
  expect(setCook({ ...base, startClient: "device" }).cookingData).toBeNull();
});

test("tenths of °F convert both ways", () => {
  expect(fromTenthsF(1400, "C")).toBeCloseTo(60);
  expect(fromTenthsF(758, "F")).toBe(75.8);
  expect(toTenthsF(60, "C")).toBe(1400);
  expect(toTenthsF(65, "C")).toBe(1490);
  expect(toTenthsF(212, "F")).toBe(2120);
});

test("cook targets are whole °F, as the G1 keeps them", () => {
  expect(targetTenthsF(72, "C")).toBe(1620); // 161.6 °F; the G1 stored 1616 as 1610 [HW]
  expect(targetTenthsF(70, "C")).toBe(1580);
  expect(targetTenthsF(149, "F")).toBe(1490);
});

describe("advertised dock state, from real G1 adverts [HW]", () => {
  // Manufacturer data after the 0x5707 key, as g1.py scan printed it.
  const advert = (tail: string) => parseAdvert(hex(`5441304344333141303830434532434e41${tail}`));

  test("docked", () => {
    expect(advert("00000302000900")).toEqual({ pairing: false, probes: [9, 0, 0, 0] });
    expect(allDocked(advert("00000302000900")!)).toBe(true);
  });

  test("out: just removed, and cooking", () => {
    expect(allDocked(advert("00000302000800")!)).toBe(false);
    expect(allDocked(advert("00000302000200")!)).toBe(false);
  });

  test("another phone mid-pairing", () => {
    expect(advert("00000343000900")?.pairing).toBe(true);
  });

  test("short or missing data", () => {
    expect(advert("0000030200")).toBeNull(); // 22 bytes: no probe 1 byte
    expect(parseAdvert([])).toBeNull();
    expect(allDocked({ pairing: false, probes: [0, 0, 0, 0] })).toBe(false);
  });
});
