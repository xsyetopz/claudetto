// The rules of the loop at the end of a turn: from the results of the checks to the new state and the next prompt.
// The adapter runs the checks and reads the usage, and this module decides.

import { DONE, NEXT, RETRY, STOPPED } from "../prompts.ts";
import { stepsText } from "./count.ts";
import type { Check, Goal, Result } from "./state.ts";

/** What the session spent: the cost in USD, and the percent used of each plan limit by its `kind`. */
export type Spend = {
  readonly usd: number;
  readonly percents: Readonly<Record<string, number>>;
};

/** The new state (`null` clears the goal), a line to show, and a prompt for the next turn (absent when the loop ends). */
export type Outcome = {
  readonly goal: Goal | null;
  readonly say: string;
  readonly submit?: string;
};

/** The words that name a check to Claude. */
export const label = (check: Check): string =>
  check.kind === "run"
    ? `\`${check.command}\` exits 0`
    : check.kind === "file"
      ? check.text === undefined
        ? `\`${check.path}\` exists`
        : `\`${check.path}\` holds \`${check.text}\``
      : check.claim;

/** The growth in percent of one plan limit since `base`. A percent below `base` means the window restarted, so it is all new. */
export const growthOf = (percent: number, base = 0): number =>
  percent >= base ? percent - base : percent;

/** The highest growth over the plan limits in `percents`, each against its own base in `bases`. */
export const planGrowth = (
  percents: Readonly<Record<string, number>>,
  bases: Readonly<Record<string, number>> = {},
): number =>
  Math.max(
    0,
    ...Object.entries(percents).map(([kind, percent]) =>
      growthOf(percent, bases[kind]),
    ),
  );

/** The first control but `stall` that says stop, or `undefined`. */
const stopReason = (goal: Goal, spend: Spend, now: number) => {
  const { maxTurns, budget, until } = goal;
  if (maxTurns !== undefined && goal.turns >= maxTurns) return "max-turns";
  const isOverUsd = budget?.usd !== undefined && goal.spentUsd >= budget.usd;
  const isOverPercent =
    budget?.percent !== undefined &&
    planGrowth(spend.percents, goal.basePercents) >= budget.percent;
  if (isOverUsd || isOverPercent) return "budget";
  return until !== undefined && now >= until ? "until" : undefined;
};

/** The text that tells the failing checks with their output apart from the next turn's. The digits are left out, because a time such as `9.00ms` changes in each run. */
const failures = (checks: readonly Check[], results: readonly Result[]) =>
  JSON.stringify(
    checks.flatMap((check, i) =>
      results[i]?.pass
        ? []
        : [[check, (results[i]?.output ?? "").replace(/\d+/g, "")]],
    ),
  );

/** `goal` paused with the `reason` in the log, and the line that tells it. */
const stopped = (goal: Goal, reason: string, now: number): Outcome => {
  const log = [...goal.log, { at: now, note: `stopped: ${reason}` }];
  const say = STOPPED({ reason, step: String(goal.step + 1) });
  return { goal: { ...goal, paused: true, log }, say };
};

/** The outcome of one turn of `goal`, with `results` for the checks of its current step. */
export const nextTurn = (
  goal: Goal,
  results: readonly Result[],
  spend: Spend,
  now: number,
): Outcome => {
  const { steps, step } = goal;
  const { title, checks } = steps[step] ?? { title: "", checks: [] };
  // A `/clear` restarts the cost of the session, so a cost below the last one is all new.
  const usd = spend.usd >= goal.lastUsd ? spend.usd - goal.lastUsd : spend.usd;
  // A limit below its base restarted its window, so its base is 0 from now on, or its growth would count short once it passes the old base.
  // A limit with no base (a goal made before the engine had the figures, or a legacy goal) takes its current percent as its base, so that turn counts no growth for it.
  const known = Object.fromEntries(
    Object.entries(goal.basePercents ?? {}).map(([kind, base]) => [
      kind,
      (spend.percents[kind] ?? base) < base ? 0 : base,
    ]),
  );
  const basePercents: Record<string, number> = { ...spend.percents, ...known };
  const turned = {
    ...goal,
    basePercents,
    turns: goal.turns + 1,
    spentUsd: goal.spentUsd + usd,
    lastUsd: spend.usd,
  };
  const failing = checks.flatMap((check, i) =>
    results[i]?.pass ? [] : [{ check, output: results[i]?.output ?? "" }],
  );
  if (failing.length === 0) {
    if (step + 1 >= steps.length) {
      return { goal: null, say: DONE({ steps: stepsText(steps.length) }) };
    }
    const log = [...goal.log, { at: now, note: `step ${step + 1} done` }];
    const next = { ...turned, step: step + 1, results: [], stalled: 0, log };
    const reason = stopReason(next, spend, now);
    if (reason !== undefined) return stopped(next, reason, now);
    const text = { done: String(step + 1), step: String(step + 2) };
    const nextTitle = steps[step + 1]?.title ?? "";
    return { goal: next, say: "", submit: NEXT({ ...text, title: nextTitle }) };
  }
  const isSame = failures(checks, results) === failures(checks, goal.results);
  const stalled = isSame ? goal.stalled + 1 : 1;
  const kept = { ...turned, results, stalled };
  const reason =
    stopReason(kept, spend, now) ??
    (stalled >= goal.stall ? "stall" : undefined);
  if (reason !== undefined) return stopped(kept, reason, now);
  const lines = failing.map(
    (f) => `- ${label(f.check)}${f.output ? `\n${f.output}` : ""}`,
  );
  const submit = RETRY({
    step: String(step + 1),
    title,
    failing: lines.join("\n"),
  });
  return { goal: kept, say: "", submit };
};
