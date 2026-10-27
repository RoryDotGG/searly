// Start a cook, change the running cook's target, or switch mode (a new cook).
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { randomId, ReceiptError } from "../ble/g1";
import { fromTenthsF, setCook, targetTenthsF, type CookingMode, type Probe, type Unit } from "../protocol/messages";
import { NotAppliedError, type G1 } from "../useG1";
import { Button, SegmentedControl } from "../ui/controls";
import { Sheet } from "../ui/layout";
import { ApplyReceipt, clock, Notice, useElapsed, type Stage } from "../ui/status";
import TargetPicker, { TARGET_RANGE } from "../ui/TargetPicker";
import { type, useTheme } from "../ui/theme";

const MODES = [
  { value: "manual", label: "Manual" },
  { value: "smart", label: "Smart" },
] as const;
const MODE_NAME: Record<CookingMode, string> = { manual: "Manual", smart: "Smart" };
const DEFAULT_TARGET = { C: 65, F: 149 } as const;

function initialTarget(probe: Probe, unit: Unit): number {
  const t = probe.setParams[0]?.setTemperature;
  const [min, max] = TARGET_RANGE[unit];
  const v = t === undefined ? DEFAULT_TARGET[unit] : Math.round(fromTenthsF(t, unit));
  return Math.min(max, Math.max(min, v));
}

interface Failure {
  at: 1 | 2;
  title: string;
  detail: string;
}

/** Mounted while open; `onDismissed` runs once the sheet has slid away. */
export default function CookSheet(props: { g1: G1; probe: Probe; unit: Unit; onDismissed: () => void }) {
  const { g1, probe, unit } = props;
  const t = useTheme();
  const [visible, setVisible] = useState(true);
  // What was running when the sheet opened decides what it is for; a confirmed start must not
  // turn it into "Change target" underneath you.
  const [running] = useState(() => (probe.cookingState === "cooking" && probe.cookUuid ? probe : null));
  const [mode, setMode] = useState<CookingMode>(running?.cookingMode === "smart" ? "smart" : "manual");
  const [target, setTarget] = useState(() => initialTarget(probe, unit));
  const [stage, setStage] = useState<Stage | null>(null);
  const [sent, setSent] = useState<{ mode: CookingMode; target: number; sameCook: boolean } | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const elapsed = useElapsed(probe.curCookSec, probe.cookingState === "cooking" && !g1.stale);

  const sameCook = running !== null && running.cookingMode === mode;
  const busy = stage === "sending" || stage === "acknowledged";
  const docked = probe.curTemperature === undefined;
  const live = g1.phase.kind === "live";

  // The cook sheet only makes sense with the probe out and the G1 connected.
  useEffect(() => {
    if ((docked || !live) && stage !== "applied") setVisible(false);
  }, [docked, live, stage]);

  const edit = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    if (stage === "applied" || stage === "failed") setStage(null);
  };

  async function apply() {
    const keep = sameCook ? running : null;
    const cookUuid = keep?.cookUuid ?? randomId();
    // A cook started on the G1 itself may not report startClient.
    const startClient = keep ? (keep.startClient ?? "device") : "android";
    const target10 = targetTenthsF(target, unit);
    let acked = false;
    setSent({ mode, target, sameCook });
    setFailure(null);
    setStage("sending");
    try {
      await g1.send(
        "WT10:cooking:action",
        setCook({ probeColor: probe.probeColor, mode, targetTenthsF: target10, cookUuid, startClient }),
        (r) =>
          r.probes.some(
            (p) =>
              p.probeColor === probe.probeColor &&
              p.cookUuid === cookUuid &&
              p.cookingMode === mode &&
              p.setParams[0]?.setTemperature === target10,
          ),
        () => {
          acked = true;
          setStage("acknowledged");
        },
      );
      setStage("applied");
    } catch (e) {
      setFailure(
        e instanceof NotAppliedError
          ? { at: 2, title: "Not applied on the G1", detail: "The G1 accepted it, but its reports don’t show the change." }
          : e instanceof ReceiptError
            ? { at: 1, title: "The G1 refused the change", detail: e.receipt.cmdError === 4 ? "It isn’t valid in this cook state." : e.message + "." }
            : { at: acked ? 2 : 1, title: "No reply from the G1", detail: "Check it’s switched on and close by, then try again." },
      );
      setStage("failed");
    }
  }

  const v = target;
  const actionLabel = !running
    ? `Start ${MODE_NAME[mode]} cook at ${v}°`
    : sameCook
      ? `Update target to ${v}°`
      : `Start new ${MODE_NAME[mode]} cook`;
  const s = sent ?? { mode, target, sameCook };
  const detail =
    stage === "applied"
      ? s.sameCook
        ? `Target ${s.target}° confirmed in the G1’s latest report. Same cook, timer still running.`
        : `${MODE_NAME[s.mode]} cook at ${s.target}° confirmed in the G1’s latest report.`
      : s.sameCook
        ? "Same cook. The timer keeps going."
        : running
          ? "A new cook. The timer restarts from 0:00."
          : "A new cook starts on the G1.";

  const footer =
    stage === "applied" ? (
      <Button size="lg" block onPress={() => setVisible(false)}>
        Done
      </Button>
    ) : stage === "failed" ? (
      <Button size="lg" block variant="secondary" onPress={() => setVisible(false)}>
        Close
      </Button>
    ) : (
      <Button size="lg" block loading={busy} onPress={() => void apply()}>
        {busy ? (s.sameCook ? "Updating" : "Starting") : actionLabel}
      </Button>
    );

  const hint = (
    <Text style={[type.body, { color: t.inkMuted, marginTop: -8 }]}>
      {mode === "smart" ? "Smart: the G1 runs its own smart cook to the target you set." : "Manual: the G1 cooks to the target you set."}
    </Text>
  );

  return (
    <Sheet
      visible={visible}
      onClose={busy ? false : () => setVisible(false)}
      onDismissed={props.onDismissed}
      title={running ? "Change target" : "Start a cook"}
      subtitle={
        running
          ? `${MODE_NAME[probe.cookingMode === "smart" ? "smart" : "manual"]} cook, ${clock(elapsed)} elapsed`
          : `Probe ${probe.probeColor.replace(/^\D+/, "") || "1"} is out of the dock.`
      }
      footer={footer}
    >
      <View pointerEvents={busy ? "none" : "auto"} style={{ gap: 20 }}>
        <SegmentedControl label="Cook mode" options={MODES} value={mode} onChange={edit(setMode)} disabled={busy} />
        {!running || !sameCook ? hint : null}
        <TargetPicker value={target} onChange={edit(setTarget)} unit={unit} disabled={busy} fadeTo={t.surfaceRaised} />
      </View>
      {stage ? (
        <ApplyReceipt
          stage={stage}
          detail={failure?.detail ?? detail}
          {...(failure ? { title: failure.title, failedAt: failure.at, onRetry: () => void apply() } : {})}
        />
      ) : running && !sameCook ? (
        <Notice tone="warn" icon="timer" title="This starts a new cook">
          {`Switching to ${MODE_NAME[mode]} ends the ${MODE_NAME[running.cookingMode === "smart" ? "smart" : "manual"]} cook. The timer restarts from 0:00.`}
        </Notice>
      ) : null}
    </Sheet>
  );
}
