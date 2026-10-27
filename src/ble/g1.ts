// The only code that touches react-native-ble-manager. See docs/SPEC.md "BLE contract (Android)".
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { PermissionsAndroid, Platform, type EventSubscription } from "react-native";
import BleManager, { BleState } from "react-native-ble-manager";

import { frames, Reassembler } from "../protocol/blufi";
import { pack, unpack } from "../protocol/envelope";
import { command, incoming, receiptError, trust, type Incoming, type Receipt } from "../protocol/messages";

const SERVICE = "ffff";
const WRITE = "ff01";
const NOTIFY = "ff02";
const NAME_PREFIX = "TM-WT10";

/** Grant BLUETOOTH_SCAN and BLUETOOTH_CONNECT (Android 12+) or fine location (older). */
export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  const wanted =
    Platform.Version >= 31
      ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const result = await PermissionsAndroid.requestMultiple(wanted);
  return wanted.every((p) => result[p] === PermissionsAndroid.RESULTS.GRANTED);
}

let started: Promise<void> | null = null;

/** Start the BLE manager once, and ask to turn Bluetooth on if it is off. */
export async function ready(): Promise<void> {
  started ??= BleManager.start().catch((e: unknown) => {
    started = null; // let the next attempt retry
    throw e;
  });
  await started;
  if ((await BleManager.checkState()) !== BleState.On) await BleManager.enableBluetooth();
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
    if (r.executeResult !== "success") throw new Error(receiptError(r));
  }

  /** First-time pairing. The probe must be docked and the user must press OK on the G1 [HW]. */
  async pair(pressOk: () => void): Promise<{ userId: string; deviceId: string }> {
    const userId = randomDigits(18);
    const deviceId = randomDigits(18);
    this.deviceId = "";
    const r = await this.request("BT:apply:trust", trust(userId, "pair"), 35_000, pressOk);
    if (r.executeResult !== "success") throw new Error(receiptError(r));
    this.deviceId = deviceId; // the G1 stores the deviceId from this envelope
    const c = await this.request("BT:Pair:Result", { result: "success" }, 10_000);
    if (c.executeResult !== "success") throw new Error(receiptError(c));
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
