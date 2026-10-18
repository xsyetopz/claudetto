// The mod handler of the `goal` slice: the `turn.complete` hook of the main thread.
// It runs the checks of the current step, and then the rules of `domain/loop.ts` give the new state and the next prompt.
// A paused goal, an interrupted turn, and a subagent turn do nothing.
// Each path starts at the project root, because `$.fs` resolves a relative path against the folder of the shell.
// `claude plugin validate` follows `$` only into a function of one file, so each function that touches `$` is here.

import type { EngineInterface } from "claude-code";
import { GOAL_FILE } from "../../../../../kernel/paths.ts";
import type { Handler } from "../../../../../kernel/slice.ts";
import { nextTurn, type Spend } from "../domain/loop.ts";
import {
  type Check,
  type Goal,
  goalText,
  parseGoal,
  type Result,
} from "../domain/state.ts";
import { OUTPUT_TAIL_CHARS, RUN_TIMEOUT_MS } from "../limits.ts";
import { JUDGE } from "../prompts.ts";

/** The goal in the state file, or `null` for no file or no goal. */
export const readGoal = ($: EngineInterface): Promise<Goal | null> =>
  $.fs.read(GOAL_FILE).then(parseGoal, () => null);

/** Writes the goal to the state file. `null` clears it. */
export const writeGoal = ($: EngineInterface, goal: Goal | null) =>
  $.fs.write(GOAL_FILE, goalText(goal));

/** The last `OUTPUT_TAIL_CHARS` characters of `text`. */
const tail = (text: string) => text.trim().slice(-OUTPUT_TAIL_CHARS);

/** Runs one check. `facts` is the answer of the turn, which only a `judge` check reads. */
export const runCheck = async (
  $: EngineInterface,
  check: Check,
  facts: string,
): Promise<Omit<Result, "at">> => {
  if (check.kind === "run") {
    const run = await $.process
      .run(["sh", "-c", check.command], { timeoutMs: RUN_TIMEOUT_MS })
      .catch((error: Error) => ({
        exitCode: 1,
        stdout: "",
        stderr: error.message,
      }));
    return { pass: run.exitCode === 0, output: tail(run.stdout + run.stderr) };
  }
  if (check.kind === "file") {
    const text = await $.fs.read(check.path).catch(() => null);
    const pass =
      text !== null && (check.text === undefined || text.includes(check.text));
    return { pass, output: "" };
  }
  const prompt = JUDGE({ claim: check.claim, facts });
  const answer = await $.model
    .classify(prompt, ["yes", "no"])
    .catch(() => "no");
  return { pass: answer === "yes", output: "" };
};

/** The spend of the session: the cost, and the highest share of a plan limit. */
const spendOf = async ($: EngineInterface): Promise<Spend> => {
  const usage = await $.session.usage();
  const percents = usage.rateLimits.map((limit) => limit.percentUsed);
  return { usd: usage.cost?.usd ?? 0, percent: Math.max(0, ...percents) };
};

export const onTurnComplete: Handler<"turn.complete"> = async ($, e, next) => {
  const goal = await readGoal($);
  if (
    !goal ||
    goal.paused ||
    e.agentId !== undefined ||
    e.reason !== "answer"
  ) {
    return next(e);
  }
  const now = await $.clock.now();
  const results: Result[] = [];
  for (const check of goal.steps[goal.step]?.checks ?? []) {
    results.push({ ...(await runCheck($, check, e.answer)), at: now });
  }
  const outcome = nextTurn(goal, results, await spendOf($), now);
  await writeGoal($, outcome.goal);
  if (outcome.say) $.ui.log(outcome.say);
  if (outcome.submit) await $.prompt.submit({ text: outcome.submit });
  return next(e);
};
