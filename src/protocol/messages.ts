// JSON messages carried in the envelope. See docs/PROTOCOL.md sections 4 to 8.
// Ids and the clock come from the caller so this module stays pure and testable.

export const MODEL = "WT10";

export interface Command {
  cmdId: string;
  cmdSeqNo: number;
  cmdType: string;
  cmdData: unknown;
  deviceId: string;
  deviceType: typeof MODEL;
  protocol: "BT";
  serverTime: number;
  serverTimeSecond: number;
}

/** Anything the G1 sends. `cmdSeqNo` arrives as a string. */
export interface Incoming {
  cmdId: string;
  cmdType: string;
  cmdData: unknown;
}

export interface Receipt {
  cmdId: string;
  cmdType: string;
  executeResult: string; // "success" or "failure"
  /** 10 = waiting for OK on the G1, 11 = refused or not owner, 4 = not valid in this cook state. */
  cmdError?: number;
  errorCode?: number;
  volume?: Volume;
}

export interface Probe {
  probeColor: string;
  cookingState: string;
  cookingMode: CookingMode;
  setParams: { setTemperature: number }[];
  // Absent while the probe is docked.
  deviceSn?: string;
  cookUuid?: string;
  startClient?: string;
  curTemperature?: number;
  curAmbientTemperature?: number;
  areaTemperature?: number[];
  batteryValue?: number;
  curCookSec?: number;
}

export interface StatusReport {
  batteryValue: number;
  volume: Volume;
  probes: Probe[];
}

export type Volume = "high" | "medium" | "low" | "mute";
export type CookingMode = "manual" | "smart";

export function command(
  cmdType: string,
  cmdData: unknown,
  ctx: { cmdId: string; cmdSeqNo: number; deviceId: string; nowMs: number },
): Command {
  return {
    cmdId: ctx.cmdId,
    cmdSeqNo: ctx.cmdSeqNo,
    cmdType,
    cmdData,
    deviceId: ctx.deviceId,
    deviceType: MODEL,
    protocol: "BT",
    serverTime: ctx.nowMs,
    serverTimeSecond: Math.floor(ctx.nowMs / 1000),
  };
}

/** Plain-language reason for a receipt that is not a success. */
export function receiptError(r: Receipt): string {
  switch (r.cmdError) {
    case 11:
      return "The G1 refused: not the owner, declined, timed out, or the probe is not in the dock";
    case 4:
      return "Not valid in this cook state";
    default:
      return `The G1 replied ${r.executeResult} (cmdError ${r.cmdError ?? "none"})`;
  }
}

/** The status report in a message, or null if it is not one. Probe fields stay optional. */
export function statusReport(m: Incoming): StatusReport | null {
  if (!m.cmdType.endsWith(":status:report")) return null;
  const d = m.cmdData as Partial<StatusReport> | null;
  if (typeof d !== "object" || d === null || !Array.isArray(d.probes)) return null;
  const probes = d.probes.filter(
    (p): p is Probe =>
      typeof p === "object" && p !== null && typeof p.probeColor === "string" && Array.isArray(p.setParams),
  );
  return { batteryValue: d.batteryValue ?? 0, volume: d.volume ?? "high", probes };
}

/** Narrow a decoded payload to a message, or null if it is not one. */
export function incoming(x: unknown): Incoming | null {
  if (typeof x !== "object" || x === null) return null;
  const m = x as Record<string, unknown>;
  if (typeof m["cmdType"] !== "string" || typeof m["cmdId"] !== "string") return null;
  return { cmdId: m["cmdId"], cmdType: m["cmdType"], cmdData: m["cmdData"] ?? null };
}

/** `BT:apply:trust` cmdData. The envelope deviceId is "" when pairing, the stored one for "direct". */
export function trust(userId: string, mode: "pair" | "direct") {
  return {
    userId,
    deviceModel: "searly",
    mode,
    lengthUnit: "cm",
    temperatureUnit: "C",
    weightUnit: "g",
  };
}

/**
 * `WT10:cooking:action` cmdData for start or change target (action 1). Start: a new cookUuid and
 * startClient "android". Change target: the running cook's cookUuid and startClient.
 */
export function setCook(p: {
  probeColor: string;
  mode: CookingMode;
  targetTenthsF: number;
  cookUuid: string;
  startClient: string;
}) {
  return {
    probeColor: p.probeColor,
    cookingAction: 1,
    cookingMode: p.mode,
    cookUuid: p.cookUuid,
    startClient: p.startClient,
    setParams: [{ setTemperature: p.targetTenthsF }],
    cookingData:
      p.startClient === "device"
        ? null
        : {
            dataType: "manual",
            dataId: "",
            dataName: p.mode === "smart" ? "Smart cook" : "Manual cook",
            dataImgUrl: "",
          },
  };
}

// All wire temperatures are integer tenths of a degree Fahrenheit [HW]. Convert only at the UI edge.
export type Unit = "C" | "F";

export function fromTenthsF(t: number, unit: Unit): number {
  const f = t / 10;
  return unit === "F" ? f : ((f - 32) * 5) / 9;
}

export function toTenthsF(v: number, unit: Unit): number {
  return Math.round((unit === "F" ? v : (v * 9) / 5 + 32) * 10);
}

/**
 * A cook target for `setParams`. The G1 keeps targets in whole °F and drops the tenths (sent 1616,
 * reported 1610) [HW], so send the nearest whole °F: the next report then matches what was sent.
 */
export function targetTenthsF(v: number, unit: Unit): number {
  return Math.round(toTenthsF(v, unit) / 10) * 10;
}
