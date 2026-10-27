// BluFi framing: | type u8 | frame_ctrl u8 | seq u8 | len u8 | data[len] |. See docs/PROTOCOL.md section 2.

/** Data frame, subtype 19 "custom data". The only type the G1 uses. */
export const CUSTOM = (19 << 2) | 1;
const FC_FRAG = 0x10;

/**
 * Split one payload into frames numbered from `seq`. Non-final fragments carry a u16 "bytes
 * remaining" prefix, so `chunk` is at most 253 (len is one byte). Over BLE use
 * min(253, mtu - 3 - 6) so a fragment fits one ATT write.
 */
export function frames(seq: number, data: Uint8Array, chunk = 253): { frames: Uint8Array[]; seq: number } {
  if (!(chunk >= 1 && chunk <= 253)) throw new RangeError(`chunk ${chunk} out of 1..253`);
  const out: Uint8Array[] = [];
  for (;;) {
    const last = data.length <= chunk;
    const n = last ? data.length : chunk + 2;
    const frame = new Uint8Array(4 + n);
    frame.set([CUSTOM, last ? 0 : FC_FRAG, seq & 0xff, n]);
    if (last) {
      frame.set(data, 4);
    } else {
      frame.set([data.length & 0xff, (data.length >> 8) & 0xff], 4);
      frame.set(data.subarray(0, chunk), 6);
    }
    out.push(frame);
    seq += 1;
    if (last) return { frames: out, seq };
    data = data.subarray(chunk);
  }
}

/** Joins notification fragments back into payloads. Reset it on disconnect. */
export class Reassembler {
  private parts: Uint8Array[] = [];

  /** Feed one notification. Returns the payload once its last fragment arrives, else null. */
  push(frame: Uint8Array): Uint8Array | null {
    const [type = 0, fc = 0, , n = 0] = frame;
    if (frame.length < 4 + n) {
      // The G1 may not fragment to the negotiated MTU (spec open question 2): make it visible.
      this.reset();
      throw new Error(`truncated notification: ${frame.length} bytes, header says ${4 + n}`);
    }
    const payload = frame.subarray(4, 4 + n);
    if (fc & FC_FRAG) {
      this.parts.push(payload.subarray(2));
      return null;
    }
    const parts = [...this.parts, payload];
    this.reset();
    if (type !== CUSTOM) return null;
    const full = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of parts) {
      full.set(part, offset);
      offset += part.length;
    }
    return full;
  }

  reset(): void {
    this.parts = [];
  }
}
