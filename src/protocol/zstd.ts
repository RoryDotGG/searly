export { decompress as zstdDecode } from "fzstd";

/**
 * A zstd frame holding one uncompressed block: magic, frame header 0xA0 (single segment, u32
 * content size), block header (len << 3 | last). The G1 accepts it [HW], so the app needs no
 * compressor. A raw block holds at most 128 KiB; the envelope's u16 lengths cap it far lower.
 */
export function zstdRaw(data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  out.set([0x28, 0xb5, 0x2f, 0xfd, 0xa0]);
  view.setUint32(5, data.length, true);
  const header = (data.length << 3) | 1;
  out.set([header & 0xff, (header >> 8) & 0xff, header >> 16], 9);
  out.set(data, 12);
  return out;
}
