import { crc16 } from "./crc";
import { zstdDecode, zstdRaw } from "./zstd";

// AA AA | comp_len u16 | raw_len u16 | zstd(json) | crc_a u16 | crc_b u16, all LE.
// crc_a covers comp_len..end of zstd, crc_b the JSON bytes. See docs/PROTOCOL.md section 3.

export function pack(obj: unknown): Uint8Array {
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  const comp = zstdRaw(raw);
  if (comp.length > 0xffff) throw new RangeError(`message too large: ${raw.length} bytes of JSON`);
  const out = new Uint8Array(10 + comp.length);
  const view = new DataView(out.buffer);
  out.set([0xaa, 0xaa]);
  view.setUint16(2, comp.length, true);
  view.setUint16(4, raw.length, true);
  out.set(comp, 6);
  view.setUint16(6 + comp.length, crc16(out.subarray(2, 6 + comp.length)), true);
  view.setUint16(8 + comp.length, crc16(raw), true);
  return out;
}

/** Decode one reassembled payload. Throws on bad magic, truncation, CRC mismatch or bad JSON. */
export function unpack(p: Uint8Array): unknown {
  if (p.length < 10 || p[0] !== 0xaa || p[1] !== 0xaa) throw new Error(`bad envelope (${p.length} bytes)`);
  const view = new DataView(p.buffer, p.byteOffset, p.byteLength);
  const clen = view.getUint16(2, true);
  const rlen = view.getUint16(4, true);
  if (p.length < 10 + clen) throw new Error(`truncated envelope: ${p.length} bytes, needs ${10 + clen}`);
  const body = p.subarray(2, 6 + clen);
  const raw = zstdDecode(body.subarray(4));
  if (
    raw.length !== rlen ||
    view.getUint16(6 + clen, true) !== crc16(body) ||
    view.getUint16(8 + clen, true) !== crc16(raw)
  ) {
    throw new Error(`crc mismatch (${p.length} bytes)`);
  }
  return JSON.parse(new TextDecoder().decode(raw));
}
