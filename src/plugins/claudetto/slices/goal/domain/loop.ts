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

/** The first control that says stop, or `undefined`. */
const stopReason = (goal: Goal, spend: Spend, now: number) => {
  const { maxTurns, budget, until } = goal;
  if (maxTurns !== undefined && goal.turns >= maxTurns) return "max-turns";
  if (budget?.usd !== undefined && spend.usd - goal.baseUsd >= budget.usd) {
    return "budget";
  }
  if (budget?.percent !== undefined && spend.percent >= budget.percent) {
    return "budget";
  }
  if (until !== undefined && now >= until) return "until";
  return goal.stalled >= goal.stall ? "stall" : undefined;
};

/** The outcome of one turn of `goal`, with `results` for the checks of its current step. */
export const nextTurn = (
  goal: Goal,
  results: readonly Result[],
  spend: Spend,
  now: number,
): Outcome => {
  const { steps, step } = goal;
  const turns = goal.turns + 1;
  const { title, checks } = steps[step] ?? { title: "", checks: [] };
  const failing = checks.flatMap((check, i) =>
    results[i]?.pass ? [] : [{ check, output: results[i]?.output ?? "" }],
  );
  if (failing.length === 0) {
    if (step + 1 >= steps.length) {
      return { goal: null, say: DONE({ steps: String(steps.length) }) };
    }
    const next = {
      ...goal,
      step: step + 1,
      results: [],
      turns,
      stalled: 0,
      signature: "",
      log: [...goal.log, { at: now, note: `step ${step + 1} done` }],
    };
    const text = { done: String(step + 1), step: String(step + 2) };
    return {
      goal: next,
      say: "",
      submit: NEXT({ ...text, title: steps[step + 1]?.title ?? "" }),
    };
  }
  const signature = JSON.stringify(failing);
  const stalled = signature === goal.signature ? goal.stalled + 1 : 1;
  const kept = { ...goal, results, turns, stalled, signature };
  const reason = stopReason(kept, spend, now);
  if (reason !== undefined) {
    const log = [...goal.log, { at: now, note: `stopped: ${reason}` }];
    const say = STOPPED({ reason, step: String(step + 1) });
    return { goal: { ...kept, paused: true, log }, say };
  }
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
