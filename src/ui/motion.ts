// Looping motion. Motion explains data arriving; with reduce motion on, loops hold still.
import { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";

import { motion, useReducedMotion } from "./theme";

/**
 * Opacity from `hi` to `lo` and back over `ms`, forever, while `on`. Holds at `rest` otherwise.
 * Bind it whether or not it is on: a view that drops a native-driven value keeps its last frame.
 */
export function useBlinkBetween(lo: number, hi: number, ms: number, on = true, rest = hi): Animated.Value {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(rest)).current;
  useEffect(() => {
    v.setValue(on && !reduced ? hi : rest);
    if (reduced || !on) return;
    const half = { duration: ms / 2, easing: motion.easeInOut, useNativeDriver: true };
    const loop = Animated.loop(
      Animated.sequence([Animated.timing(v, { toValue: lo, ...half }), Animated.timing(v, { toValue: hi, ...half })]),
    );
    loop.start();
    return () => loop.stop();
  }, [lo, hi, ms, on, rest, reduced, v]);
  return v;
}

/** The design's sr-blink: opacity 1, 0.35, 1. */
export function useBlink(ms: number, on = true): Animated.Value {
  return useBlinkBetween(0.35, 1, ms, on);
}

/** 0 to 1 over `ms`, forever, first starting after `delay`, while `on`. Holds at 0 with reduce motion. */
export function useLoop(ms: number, on = true, delay = 0): Animated.Value {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    if (reduced || !on) return;
    const loop = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(Animated.timing(v, { toValue: 1, duration: ms, easing: motion.easeOut, useNativeDriver: true })),
    ]);
    loop.start();
    return () => loop.stop();
  }, [ms, on, delay, reduced, v]);
  return v;
}

/** A clock that ticks every second while `on`. */
export function useNow(on = true): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!on) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [on]);
  return now;
}
