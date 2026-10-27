// The only code that touches react-native-ble-manager. See docs/SPEC.md "BLE contract (Android)".
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { PermissionsAndroid, Platform, type EventSubscription } from "react-native";
import BleManager, { BleState } from "react-native-ble-manager";

import { CUSTOM, ERROR, frames, GET_VERSION, Reassembler, VERSION } from "../protocol/blufi";
import { pack, unpack } from "../protocol/envelope";
import { command, incoming, receiptError, trust, type Incoming, type Receipt } from "../protocol/messages";

const SERVICE = "ffff";
const WRITE = "ff01";
const NOTIFY = "ff02";
const NAME_PREFIX = "TM-WT10";

/** Something the user has to fix before the app can reach the G1. */
export class SetupError extends Error {
  constructor(
    message: string,
    readonly fix: "retry" | "settings",
  ) {
    super(message);
  }
}

/** A receipt that is not a success, kept so callers can tell cmdError 11 from the rest. */
export class ReceiptError extends Error {
  constructor(readonly receipt: Receipt) {
    super(receiptError(receipt));
  }
}

/** Grant BLUETOOTH_SCAN and BLUETOOTH_CONNECT (Android 12+) or fine location (older). */
async function requestPermissions(): Promise<void> {
  if (Platform.OS !== "android") return;
  const wanted =
    Platform.Version >= 31
      ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const result = await PermissionsAndroid.requestMultiple(wanted);
  const states = wanted.map((p) => result[p]);
  if (states.every((r) => r === PermissionsAndroid.RESULTS.GRANTED)) return;
  if (states.includes(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) {
    throw new SetupError("Searly needs the Nearby devices permission. Allow it in Settings.", "settings");
  }
  throw new SetupError("Searly needs the Nearby devices permission to find the G1.", "retry");
}

let started: Promise<void> | null = null;

/**
 * Permissions, then start the BLE manager once, then Bluetooth on. `prompt` asks the user to turn
 * Bluetooth on; without it an off adapter is an error (no dialog spam while reconnecting).
 */
export async function ready(prompt: boolean): Promise<void> {
  await requestPermissions();
  started ??= BleManager.start().catch((e: unknown) => {
    started = null; // let the next attempt retry
    throw e;
  });
  await started;
  if ((await BleManager.checkState()) === BleState.On) return;
  if (prompt) {
    try {
      await BleManager.enableBluetooth();
      return;
    } catch {
      // declined
    }
  }
  throw new SetupError("Bluetooth is off.", "retry");
}

/** Runs `cb` each time the Bluetooth adapter turns on. */
export function onBluetoothOn(cb: () => void): EventSubscription {
  return BleManager.onDidUpdateState(({ state }) => {
    if (state === BleState.On) cb();
  });
}

/** Scan for the stored G1, or any G1 when there is none. Resolves with its peripheral id. */
export function find(peripheralId?: string, seconds = 20): Promise<string> {
  return new Promise((resolve, reject) => {
    const done = () => {
      discovered.remove();
      stopped.remove();
    };
    const discovered = BleManager.onDiscoverPeripheral((p) => {
      const name = p.advertising.localName ?? p.name ?? "";
      if (peripheralId ? p.id !== peripheralId : !name.startsWith(NAME_PREFIX)) return;
      done();
      void BleManager.stopScan();
      resolve(p.id);
    });
    const stopped = BleManager.onStopScan(() => {
      done();
      reject(new Error("G1 not found. Is it on and in range?"));
    });
    BleManager.scan({ serviceUUIDs: [SERVICE], seconds }).catch((e: unknown) => {
      done();
      reject(e instanceof Error ? e : new Error(String(e)));
    });
  });
}

export interface SessionEvents {
  log(line: string): void;
  /** Everything except receipts for our own commands. */
  message(m: Incoming): void;
  disconnected(reason: string): void;
}

interface Waiting {
  resolve(r: Receipt): void;
  reject(e: Error): void;
  onWaiting?: (() => void) | undefined;
}

// Survives reconnects, as the G1's own counter does [HW].
let cmdSeqNo = 0;

/** One BLE connection to a G1: framing, a serial write queue, and receipts matched by cmdId. */
export class G1Session {
  private seq = 0;
  private chunk = 14;
  private mtu = 23;
  private largestNotify = 0;
  private rx = new Reassembler();
  private writes: Promise<unknown> = Promise.resolve();
  private waiting = new Map<string, Waiting>();
  private subs: EventSubscription[] = [];
  private open = true;
  private probe: ((frameType: number) => void) | null = null;

  private constructor(
    readonly peripheralId: string,
    private deviceId: string,
    private events: SessionEvents,
  ) {}

  /** Connect, raise the MTU (Android starts at 23; frames are up to 259 bytes) and subscribe. */
  static async connect(peripheralId: string, deviceId: string, events: SessionEvents): Promise<G1Session> {
    const s = new G1Session(peripheralId, deviceId, events);
    s.subs.push(
      BleManager.onDidUpdateValueForCharacteristic((e) => {
        if (e.peripheral === peripheralId) s.onNotify(new Uint8Array(e.value));
      }),
      BleManager.onDisconnectPeripheral((e) => {
        if (e.peripheral === peripheralId) s.closed(`disconnected (status ${e.status ?? "?"})`);
      }),
    );
    try {
      await BleManager.connect(peripheralId);
      await BleManager.retrieveServices(peripheralId);
      s.mtu = await BleManager.requestMTU(peripheralId, 512);
      s.chunk = Math.min(253, s.mtu - 3 - 6);
      await BleManager.startNotification(peripheralId, SERVICE, NOTIFY);
      await s.syncSeq();
    } catch (e) {
      await s.close();
      throw e;
    }
    events.log(`connected, MTU ${s.mtu}, write chunk ${s.chunk}`);
    return s;
  }

  /** Reconnect with a stored identity: no button press [HW]. */
  async trust(userId: string): Promise<void> {
    const r = await this.request("BT:apply:trust", trust(userId, "direct"), 10_000);
    if (r.executeResult !== "success") throw new ReceiptError(r);
  }

  /** First-time pairing. The probe must be docked and the user must press OK on the G1 [HW]. */
  async pair(pressOk: () => void): Promise<{ userId: string; deviceId: string }> {
    const userId = randomDigits(18);
    const deviceId = randomDigits(18);
    this.deviceId = "";
    const r = await this.request("BT:apply:trust", trust(userId, "pair"), 35_000, pressOk);
    if (r.executeResult !== "success") throw new ReceiptError(r);
    this.deviceId = deviceId; // the G1 stores the deviceId from this envelope
    const c = await this.request("BT:Pair:Result", { result: "success" }, 10_000);
    if (c.executeResult !== "success") throw new ReceiptError(c);
    return { userId, deviceId };
  }

  /** Send a command and wait for its receipt. `onWaiting` runs on cmdError 10 (press OK). */
  async request(cmdType: string, cmdData: unknown, timeoutMs: number, onWaiting?: () => void): Promise<Receipt> {
    if (!this.open) throw new Error("Not connected");
    cmdSeqNo += 1;
    const cmd = command(cmdType, cmdData, {
      cmdId: Crypto.randomUUID().replace(/-/g, ""),
      cmdSeqNo,
      deviceId: this.deviceId,
      nowMs: Date.now(),
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const receipt = new Promise<Receipt>((resolve, reject) => {
      timer = setTimeout(() => {
        this.waiting.delete(cmd.cmdId);
        reject(new Error("No reply from the G1"));
      }, timeoutMs);
      this.waiting.set(cmd.cmdId, { resolve, reject, onWaiting });
    });
    receipt.catch(() => undefined); // a disconnect mid-write rejects it before it is awaited
    try {
      await this.write(pack(cmd));
      return await receipt;
    } finally {
      clearTimeout(timer);
      this.waiting.delete(cmd.cmdId);
    }
  }

  async close(): Promise<void> {
    this.closed("closed");
    await BleManager.disconnect(this.peripheralId).catch(() => undefined);
  }

  /**
   * Find the frame counter the G1 expects. It is 0 on a fresh link, but after a hard kill Android
   * can hand the old link to the new process, and the G1 keeps counting from the old session [HW].
   * A frame with the wrong counter gets an error frame and does not advance it, so probe with
   * harmless "get version" frames until one is accepted. Runs before any other write.
   */
  private async syncSeq(): Promise<void> {
    for (let seq = 0; seq < 256; seq++) {
      const reply = new Promise<number>((resolve) => {
        this.probe = resolve;
        setTimeout(() => resolve(-1), 1_000); // no reply at all: assume accepted
      });
      await BleManager.write(this.peripheralId, SERVICE, WRITE, [GET_VERSION, 0, seq, 0], 4);
      const frameType = await reply;
      this.probe = null;
      if (frameType !== ERROR) {
        this.seq = seq + 1;
        if (seq > 0) this.events.log(`G1 expected frame ${seq}; resynced`);
        return;
      }
    }
    throw new Error("Could not agree a frame counter with the G1");
  }

  /** All writes share one queue so frames from two commands never interleave. */
  private write(payload: Uint8Array): Promise<void> {
    const next = this.writes.then(async () => {
      const out = frames(this.seq, payload, this.chunk);
      this.seq = out.seq;
      for (const f of out.frames) {
        // maxByteSize defaults to 20 and the library would split the frame itself.
        await BleManager.write(this.peripheralId, SERVICE, WRITE, Array.from(f), f.length);
      }
    });
    this.writes = next.catch(() => undefined);
    return next;
  }

  private onNotify(value: Uint8Array): void {
    if (value.length > this.largestNotify) {
      // Spec open question 2: does the G1 fragment to the negotiated MTU?
      this.largestNotify = value.length;
      this.events.log(`largest notification so far: ${value.length} bytes (MTU ${this.mtu})`);
    }
    const frameType = value[0] ?? 0;
    if (this.probe && (frameType === ERROR || frameType === VERSION)) return this.probe(frameType);
    if (frameType === VERSION) return;
    if (frameType !== CUSTOM) {
      const hex = Array.from(value, (b) => b.toString(16).padStart(2, "0")).join(" ");
      this.events.log(`non-data frame: ${hex}`);
    }
    let msg: Incoming | null;
    try {
      const payload = this.rx.push(value);
      if (!payload) return;
      msg = incoming(unpack(payload));
    } catch (e) {
      this.events.log(`dropped frame (${value.length} bytes): ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    if (!msg) return;
    const r = msg.cmdData as Receipt | null;
    const w = msg.cmdType === "device:cmd:receipt" && r ? this.waiting.get(r.cmdId) : undefined;
    if (!w || !r) {
      this.events.message(msg);
    } else if (r.cmdError === 10) {
      w.onWaiting?.();
    } else {
      w.resolve(r);
    }
  }

  private closed(reason: string): void {
    if (!this.open) return;
    this.open = false;
    for (const s of this.subs) s.remove();
    for (const w of this.waiting.values()) w.reject(new Error(reason));
    this.waiting.clear();
    this.rx.reset();
    this.events.disconnected(reason);
  }
}

/** n random decimal digits, first one non-zero (the G1's userId / deviceId format). */
function randomDigits(n: number): string {
  let out = "";
  while (out.length < n) {
    for (const b of Crypto.getRandomBytes(n)) {
      // Rejecting 250..255 keeps b % 10 uniform.
      if (b >= 250 || out.length === n || (out === "" && b % 10 === 0)) continue;
      out += String(b % 10);
    }
  }
  return out;
}

export interface Identity {
  userId: string;
  deviceId: string;
  peripheralId: string;
}

// Anyone holding these can drive the G1, so they live in the keystore.
const IDENTITY_KEY = "g1.identity";

export async function loadIdentity(): Promise<Identity | null> {
  const raw = await SecureStore.getItemAsync(IDENTITY_KEY);
  if (!raw) return null;
  const v = JSON.parse(raw) as Partial<Identity>;
  if (typeof v.userId !== "string" || typeof v.deviceId !== "string" || typeof v.peripheralId !== "string") {
    return null;
  }
  return { userId: v.userId, deviceId: v.deviceId, peripheralId: v.peripheralId };
}

export function saveIdentity(identity: Identity): Promise<void> {
  return SecureStore.setItemAsync(IDENTITY_KEY, JSON.stringify(identity));
}

export function forgetIdentity(): Promise<void> {
  return SecureStore.deleteItemAsync(IDENTITY_KEY);
}
