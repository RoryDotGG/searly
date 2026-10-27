import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { BackHandler, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { loadUnit, saveUnit } from "./src/prefs";
import type { Unit } from "./src/protocol/messages";
import CookSheet from "./src/screens/CookSheet";
import DebugLog from "./src/screens/DebugLog";
import LiveScreen, { pillFor } from "./src/screens/LiveScreen";
import { Dock, Paired, PressOk, Welcome } from "./src/screens/PairScreens";
import { BluetoothOff, NotRecognised, Permission, Searching, StorageError, type Bar } from "./src/screens/RecoveryScreens";
import SettingsSheet, { ForgetSheet } from "./src/screens/SettingsSheet";
import { IconButton } from "./src/ui/controls";
import { useNow } from "./src/ui/motion";
import { ConnectionPill } from "./src/ui/status";
import { useTheme } from "./src/ui/theme";
import { useG1 } from "./src/useG1";

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

// No router: the connection state picks the screen (see docs/SPEC.md). Cook, settings and
// confirmations are bottom sheets.
function Root() {
  const g1 = useG1();
  const t = useTheme();
  const now = useNow();
  const [unit, setUnit] = useState<Unit>("C");
  const [step, setStep] = useState<"welcome" | "dock">("welcome");
  const [repairing, setRepairing] = useState(false);
  const [justPaired, setJustPaired] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [sheet, setSheet] = useState<"cook" | "settings" | "forget" | null>(null);
  const p = g1.phase;
  const prev = useRef(p.kind);

  useEffect(() => {
    loadUnit().then(setUnit, () => undefined);
  }, []);

  // Pairing just succeeded: show Paired once, and reset the pairing steps.
  useEffect(() => {
    if (prev.current === "pairing" && p.kind === "live") {
      setJustPaired(true);
      setRepairing(false);
      setStep("welcome");
    }
    prev.current = p.kind;
  }, [p.kind]);

  // Back from step 1 returns to Welcome, as its close button does.
  const onDock = p.kind === "no-identity" && step === "dock";
  useEffect(() => {
    if (!onDock) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setStep("welcome");
      return true;
    });
    return () => sub.remove();
  }, [onDock]);

  const changeUnit = (u: Unit) => {
    setUnit(u);
    void saveUnit(u);
  };
  const openLog = () => setShowLog(true);
  const cancelPair = () => {
    if (p.kind === "pairing" || p.kind === "error") g1.cancelPair();
    setStep("welcome");
    setRepairing(false);
  };

  const pill = pillFor(g1, now);
  const bar: Bar = g1.paired
    ? {
        title: "G1",
        subtitle: g1.name ?? undefined,
        onTitleLongPress: openLog,
        actions: (
          <>
            <ConnectionPill state={pill.state} seconds={pill.seconds} beat={g1.beat} />
            <IconButton icon="sliders" label="Settings" onPress={() => setSheet("settings")} />
          </>
        ),
      }
    : { title: "Pair a G1", onTitleLongPress: openLog, actions: <ConnectionPill state={pill.state} /> };

  let screen;
  if (p.kind === "starting") {
    screen = <View style={{ flex: 1, backgroundColor: t.ground }} />;
  } else if (justPaired && p.kind === "live") {
    screen = <Paired name={g1.name} onContinue={() => setJustPaired(false)} />;
  } else if (p.kind === "pairing") {
    screen =
      p.pressOkAt === null ? (
        <Dock searching failure={null} onStart={g1.pair} onCancel={cancelPair} onDebug={openLog} />
      ) : (
        <PressOk since={p.pressOkAt} onCancel={cancelPair} onDebug={openLog} />
      );
  } else if (p.kind === "error" && p.cause === "pairing") {
    screen = <Dock searching={false} failure={p.failure} onStart={g1.pair} onCancel={cancelPair} onDebug={openLog} />;
  } else if (p.kind === "error" && p.cause === "bluetooth") {
    screen = <BluetoothOff bar={bar} paired={g1.paired} onTurnOn={g1.retry} />;
  } else if (p.kind === "error" && p.cause === "permission") {
    screen = <Permission bar={bar} settings={p.fix === "settings"} onFix={g1.retry} />;
  } else if (p.kind === "error") {
    screen = <StorageError bar={{ ...bar, title: "Searly", subtitle: undefined, actions: null }} onRetry={g1.retry} />;
  } else if (p.kind === "no-identity") {
    screen =
      step === "welcome" ? (
        <Welcome onPair={() => setStep("dock")} onDebug={openLog} />
      ) : (
        <Dock searching={false} failure={null} onStart={g1.pair} onCancel={cancelPair} onDebug={openLog} />
      );
  } else if (p.kind === "needs-repair") {
    screen = repairing ? (
      <Dock searching={false} failure={null} onStart={g1.pair} onCancel={cancelPair} onDebug={openLog} />
    ) : (
      <NotRecognised bar={bar} onPairAgain={() => setRepairing(true)} onForget={() => setSheet("forget")} />
    );
  } else if (g1.report) {
    screen = <LiveScreen g1={g1} unit={unit} bar={bar} onCook={() => setSheet("cook")} />;
  } else {
    screen = (
      <Searching
        bar={bar}
        connecting={p.kind === "connecting" || p.kind === "trusting"}
        attempt={p.kind === "reconnecting" ? p.attempt : 0}
        nextIn={p.kind === "reconnecting" && p.nextAt !== null ? Math.max(0, Math.ceil((p.nextAt - now) / 1000)) : null}
        onTryNow={g1.retryNow}
      />
    );
  }

  const probe = g1.report?.probes[0];
  const closeSheet = () => setSheet(null);
  return (
    <View style={{ flex: 1, backgroundColor: t.ground }}>
      {screen}
      {sheet === "cook" && probe ? <CookSheet g1={g1} probe={probe} unit={unit} onDismissed={closeSheet} /> : null}
      {sheet === "settings" ? <SettingsSheet g1={g1} unit={unit} onUnit={changeUnit} onDismissed={closeSheet} /> : null}
      {sheet === "forget" ? <ForgetSheet g1={g1} onDismissed={closeSheet} /> : null}
      <DebugLog g1={g1} visible={showLog} onClose={() => setShowLog(false)} />
      <StatusBar style={t.dark ? "light" : "dark"} />
    </View>
  );
}
