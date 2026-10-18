// The rules of the loop at the end of a turn: from the results of the checks to the new state and the next prompt.
// The adapter runs the checks and reads the usage, and this module decides.

import { DONE, NEXT, RETRY, STOPPED } from "../prompts.ts";
import type { Check, Goal, Result } from "./state.ts";

/** What the session spent: the cost in USD, and the highest percent of a plan limit. */
export type Spend = { readonly usd: number; readonly percent: number };

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

/** The first control but `stall` that says stop, or `undefined`. */
const stopReason = (goal: Goal, percent: number, now: number) => {
  const { maxTurns, budget, until } = goal;
  if (maxTurns !== undefined && goal.turns >= maxTurns) return "max-turns";
  const isOverUsd = budget?.usd !== undefined && goal.spentUsd >= budget.usd;
  const isOverPercent =
    budget?.percent !== undefined && percent >= budget.percent;
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
  const turned = {
    ...goal,
    turns: goal.turns + 1,
    spentUsd: goal.spentUsd + usd,
    lastUsd: spend.usd,
  };
  const failing = checks.flatMap((check, i) =>
    results[i]?.pass ? [] : [{ check, output: results[i]?.output ?? "" }],
  );
  if (failing.length === 0) {
    if (step + 1 >= steps.length) {
      return { goal: null, say: DONE({ steps: String(steps.length) }) };
    }
    const log = [...goal.log, { at: now, note: `step ${step + 1} done` }];
    const next = { ...turned, step: step + 1, results: [], stalled: 0, log };
    const reason = stopReason(next, spend.percent, now);
    if (reason !== undefined) return stopped(next, reason, now);
    const text = { done: String(step + 1), step: String(step + 2) };
    const nextTitle = steps[step + 1]?.title ?? "";
    return { goal: next, say: "", submit: NEXT({ ...text, title: nextTitle }) };
  }
  const isSame = failures(checks, results) === failures(checks, goal.results);
  const stalled = isSame ? goal.stalled + 1 : 1;
  const kept = { ...turned, results, stalled };
  const reason =
    stopReason(kept, spend.percent, now) ??
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
