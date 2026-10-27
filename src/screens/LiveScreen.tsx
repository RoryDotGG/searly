// The live screen, top to bottom: cook chip and timer, heat dial, at most one notice, the probe card
// and the batteries. One primary action at the bottom.
import { useState, type ReactNode } from "react";
import { View } from "react-native";

import { fromTenthsF, type Probe, type Unit } from "../protocol/messages";
import type { G1 } from "../useG1";
import { Button } from "../ui/controls";
import HeatDial, { type DialState } from "../ui/HeatDial";
import { Caption, Screen, Tile } from "../ui/layout";
import ProbeZones from "../ui/ProbeZones";
import { Battery, CookStatus, Notice, RetrySchedule, type PillState } from "../ui/status";
import type { Bar } from "./RecoveryScreens";

const LOW_BATTERY = 20;

/** The connection pill for a paired G1. */
export function pillFor(g1: G1, now: number): { state: PillState; seconds?: number | undefined } {
  const p = g1.phase;
  switch (p.kind) {
    case "live":
      return g1.stale ? { state: "stale", seconds: Math.round(g1.silentFor / 1000) } : { state: "live" };
    case "reconnecting":
      return { state: "reconnecting", seconds: p.nextAt === null ? undefined : Math.max(0, Math.ceil((p.nextAt - now) / 1000)) };
    case "scanning":
      return { state: "searching" };
    case "connecting":
    case "trusting":
      return { state: "connecting" };
    case "error":
      return p.cause === "bluetooth" ? { state: "off" } : p.cause === "permission" ? { state: "permission" } : { state: "error" };
    case "needs-repair":
      return { state: "error" };
    default:
      return { state: "searching" };
  }
}

function lowBattery(probe: Probe, g1Level: number, cooking: boolean): ReactNode {
  const probeLow = probe.batteryValue !== undefined && probe.batteryValue <= LOW_BATTERY;
  const baseLow = g1Level <= LOW_BATTERY;
  if (!probeLow && !baseLow) return null;
  const title =
    probeLow && baseLow
      ? `Probe battery ${probe.batteryValue}%, G1 ${g1Level}%`
      : probeLow
        ? `Probe battery ${probe.batteryValue}%`
        : `G1 battery ${g1Level}%`;
  const body = probeLow
    ? cooking
      ? "Docking the probe ends the cook, so charge it once you’re done."
      : "Put the probe back in the dock to charge it before you start a cook."
    : "Charge the G1 soon. If it switches off, the readings stop.";
  return (
    <Notice tone="warn" icon={probeLow ? "probe" : "alert"} title={title}>
      {body}
    </Notice>
  );
}

export default function LiveScreen(props: { g1: G1; unit: Unit; bar: Bar; onCook: () => void }) {
  const { g1, unit } = props;
  const report = g1.report!;
  const [bodyH, setBodyH] = useState(0);
  const [dial, setDial] = useState(288);
  const probe = report.probes[0];
  const conv = (v: number | undefined) => (v === undefined ? undefined : fromTenthsF(v, unit));

  const docked = !probe || probe.curTemperature === undefined;
  const cooking = !docked && probe.cookingState === "cooking";
  const core = conv(probe?.curTemperature);
  const target = conv(probe?.setParams[0]?.setTemperature);
  const start = conv(g1.cookStart(probe?.cookUuid));
  const done = cooking && core !== undefined && target !== undefined && core >= target;
  const stale = g1.stale;
  const dialState: DialState = docked ? "docked" : !cooking ? "ready" : stale ? "stale" : "cooking";

  let notice: ReactNode = null;
  if (stale) {
    const p = g1.phase;
    const body =
      p.kind === "reconnecting"
        ? "Showing the last reading. Searly keeps trying while the app is open."
        : p.kind === "live"
          ? "Showing the last reading. Try now reconnects to the G1."
          : "Showing the last reading. Searly is connecting now.";
    notice = (
      <Notice
        tone="warn"
        title={`No data for ${Math.round(g1.silentFor / 1000)} s`}
        {...(p.kind === "reconnecting" ? { action: <RetrySchedule attempt={Math.min(5, p.attempt - 1)} /> } : {})}
      >
        {body}
      </Notice>
    );
  } else if (docked) {
    notice = (
      <Notice tone="info" icon="probe" title="Take the probe out to start a cook">
        The G1 can only start a cook with the probe out of the dock.
      </Notice>
    );
  } else if (probe) {
    notice = lowBattery(probe, report.batteryValue, cooking);
  }

  const footer = stale ? (
    <Button size="lg" block variant="secondary" icon="refresh" onPress={g1.retryNow}>
      Try now
    </Button>
  ) : docked ? (
    <>
      <Button size="lg" block disabled>
        Start cook
      </Button>
      <Caption>Available once the probe is out of the dock.</Caption>
    </>
  ) : cooking ? (
    <>
      <Button size="lg" block icon="thermometer" onPress={props.onCook}>
        Change target
      </Button>
      <Caption>To end the cook, put the probe back in the dock.</Caption>
    </>
  ) : (
    <Button size="lg" block icon="thermometer" onPress={props.onCook}>
      Start cook
    </Button>
  );

  return (
    <Screen {...props.bar} footer={footer}>
      <View style={{ flex: 1 }} onLayout={(e) => setBodyH(e.nativeEvent.layout.height)}>
        <View
          style={{ gap: 16 }}
          onLayout={(e) => {
            // 288 by default, 256 when the screen is too short for everything.
            const h = e.nativeEvent.layout.height;
            if (!bodyH) return;
            if (dial === 288 && h > bodyH) setDial(256);
            else if (dial === 256 && h + 32 <= bodyH) setDial(288);
          }}
        >
          <View style={{ alignItems: "center", paddingTop: 2 }}>
            <CookStatus
              state={docked ? "docked" : cooking ? (done ? "done" : "cooking") : "idle"}
              mode={probe?.cookingMode === "smart" ? "smart" : "manual"}
              elapsed={probe?.curCookSec}
              running={cooking && !stale}
            />
          </View>
          <HeatDial state={dialState} core={core} target={target} start={start} unit={unit} size={dial} />
          {notice}
          {!stale && !docked && probe ? (
            <Tile style={{ paddingTop: 12, paddingBottom: 4 }}>
              <ProbeZones
                zones={(probe.areaTemperature ?? []).map((v) => fromTenthsF(v, unit))}
                ambient={conv(probe.curAmbientTemperature)}
                start={start}
                target={cooking ? target : undefined}
                unit={unit}
                probeNumber={probe.probeColor.replace(/^\D+/, "") || "1"}
              />
            </Tile>
          ) : null}
          {stale ? null : (
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 }}>
              <Battery label="Probe" level={probe?.batteryValue} charging={docked} />
              <Battery label="G1" level={report.batteryValue} />
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}
