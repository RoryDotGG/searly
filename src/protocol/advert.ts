// The G1's manufacturer data: dock and pairing state, readable while scanning, before trust.
// See docs/PROTOCOL.md section 1.1. Mirrors adv() in experiments/python/g1.py.

/** The manufacturer data key: really device type 7 (WT10) and ASCII "W". */
export const COMPANY = 0x5707;

const DOCKED = 9; // probe state nibble with the probe in the dock [HW]

export interface Advert {
  /** Another client is mid-pairing with the G1. */
  pairing: boolean;
  /** One state nibble per probe slot; 0 = no probe. */
  probes: number[];
}

/** Decode manufacturer data (company id already stripped), or null if it is too short. */
export function parseAdvert(data: ArrayLike<number>): Advert | null {
  if (data.length < 23) return null;
  const base = data[20]!;
  const p12 = data[22]!;
  const p34 = data[21]!;
  return { pairing: (base & 0x40) !== 0, probes: [p12 & 15, p12 >> 4, p34 & 15, p34 >> 4] };
}

/** Every probe the G1 has is in its dock. */
export function allDocked(a: Advert): boolean {
  const present = a.probes.filter((p) => p !== 0);
  return present.length > 0 && present.every((p) => p === DOCKED);
}
