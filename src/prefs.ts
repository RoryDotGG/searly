import * as SecureStore from "expo-secure-store";

import type { Unit } from "./protocol/messages";

// SecureStore is already installed; a one-letter preference does not justify AsyncStorage.
const UNIT_KEY = "pref.unit";

export async function loadUnit(): Promise<Unit> {
  return (await SecureStore.getItemAsync(UNIT_KEY)) === "F" ? "F" : "C";
}

export function saveUnit(unit: Unit): Promise<void> {
  return SecureStore.setItemAsync(UNIT_KEY, unit);
}
