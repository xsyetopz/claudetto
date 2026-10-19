// The mod handler of the `goal` slice: the `turn.complete` hook of the main thread.
// It runs the checks of the current step, and then the rules of `domain/loop.ts` give the new state and the next prompt.
// A paused goal, an interrupted turn, and a subagent turn do nothing.
// Each path starts at the project root, because `$.fs` resolves a relative path against the folder of the shell.
// `claude plugin validate` follows `$` only into a function of one file, so each function that touches `$` is here.

import type { EngineInterface } from "claude-code";
import { GOAL_FILE } from "../../../../../kernel/paths.ts";
import type { Handler } from "../../../../../kernel/slice.ts";
import { change, parseArgs, statusText } from "../domain/command.ts";
import { nextTurn, type Spend } from "../domain/loop.ts";
import { conditionSteps, planSteps } from "../domain/plan.ts";
import {
  type Check,
  createGoal,
  type Goal,
  parseGoal,
  type Result,
} from "../domain/state.ts";
import { OUTPUT_TAIL_CHARS, RUN_TIMEOUT_MS } from "../limits.ts";
import { DESCRIPTION, JUDGE, PROPOSE_DENY, START } from "../prompts.ts";

/** The project root: `CLAUDE_PROJECT_DIR`, or the root of the session, or `""` with no root. */
const rootOf = async ($: EngineInterface): Promise<string> =>
  (await $.env.get("CLAUDE_PROJECT_DIR").catch(() => undefined)) ||
  (await $.session.root().catch(() => ""));

/** `path` under `root`, because `$.fs` resolves a relative path against the folder of the shell. A path that starts with `/` stays. */
const under = (root: string, path: string) =>
  root === "" || path.startsWith("/")
    ? path
    : `${root.replace(/\/+$/, "")}/${path}`;

/** The goal in the state file, or `null` for no file or no goal. */
export const readGoal = async ($: EngineInterface): Promise<Goal | null> =>
  $.fs.read(under(await rootOf($), GOAL_FILE)).then(parseGoal, () => null);

/** Writes the goal to the state file. `null` clears it. */
export const writeGoal = async ($: EngineInterface, goal: Goal | null) =>
  $.fs.write(under(await rootOf($), GOAL_FILE), JSON.stringify(goal, null, 2));

/** The last `OUTPUT_TAIL_CHARS` characters of `text`. */
const tail = (text: string) => text.trim().slice(-OUTPUT_TAIL_CHARS);

/** Runs one check. `facts` is the answer of the turn, which only a `judge` check reads. */
export const runCheck = async (
  $: EngineInterface,
  check: Check,
  facts: string,
): Promise<Omit<Result, "at">> => {
  const root = await rootOf($);
  if (check.kind === "run") {
    const run = await $.process
      .run(["sh", "-c", check.command], {
        ...(root ? { cwd: root } : {}),
        timeoutMs: RUN_TIMEOUT_MS,
      })
      .catch((error: Error) => ({
        exitCode: 1,
        stdout: "",
        stderr: error.message,
      }));
    return { pass: run.exitCode === 0, output: tail(run.stdout + run.stderr) };
  }
  if (check.kind === "file") {
    const text = await $.fs.read(under(root, check.path)).catch(() => null);
    const pass =
      text !== null && (check.text === undefined || text.includes(check.text));
    return { pass, output: "" };
  }
  const prompt = JUDGE({ claim: check.claim, facts });
  const answer = await $.model
    .classify(prompt, ["yes", "no"])
    .catch(() => undefined);
  return { pass: answer === "yes", output: "" };
};

/** The spend of the session: the cost, and the highest share of a plan limit. */
const spendOf = async ($: EngineInterface): Promise<Spend> => {
  const usage = await $.session.usage();
  const percents = usage.rateLimits.map((limit) => limit.percentUsed);
  return { usd: usage.cost?.usd ?? 0, percent: Math.max(0, ...percents) };
};

export const onTurnComplete: Handler<"turn.complete"> = async ($, e, next) => {
  if (e.agentId !== undefined || e.reason !== "answer") return next(e);
  const goal = await readGoal($);
  if (!goal || goal.paused) return next(e);
  const now = await $.clock.now();
  const results: Result[] = [];
  for (const check of goal.steps[goal.step]?.checks ?? []) {
    results.push({ ...(await runCheck($, check, e.answer)), at: now });
  }
  // The usage is read only for a goal with a budget.
  const spend = goal.budget ? await spendOf($) : { usd: 0, percent: 0 };
  const outcome = nextTurn(goal, results, spend, now);
  await writeGoal($, outcome.goal);
  if (outcome.say) $.ui.log(outcome.say);
  if (outcome.submit) {
    void $.prompt.submit({ text: outcome.submit }).catch(() => undefined);
  }
  return next(e);
};

/** `tool.call` of `ProposeGoal`: the tool is off, and the text names `/goal`. */
export const onProposeGoal = () => ({
  deny: PROPOSE_DENY,
});

/** Starts a turn on the current step of `goal`. Claude Code refuses `$.prompt.submit` in a `command.run` hook (see the header of `slices/handoff/adapters/mod.ts`, which does the same), so a timer runs it after the hook. */
const begin = ($: EngineInterface, goal: Goal) => {
  const { title } = goal.steps[goal.step] ?? { title: "" };
  const text = START({
    steps: String(goal.steps.length),
    step: String(goal.step + 1),
    title,
  });
  $.clock.after(0, () => void $.prompt.submit({ text }).catch(() => undefined));
};

/** The goal for the text after `/goal`, or the line that tells what is wrong: the steps of a plan file for a name that ends in `.md`, else the steps of the condition. */
const newGoal = async ($: EngineInterface, args: string, now: number) => {
  const parsed = parseArgs(args, now);
  if (typeof parsed === "string") return parsed;
  const { condition, controls } = parsed;
  if (!condition) return "Give a condition or a plan file of steps.";
  let steps = conditionSteps(condition);
  if (/^\S+\.md$/.test(condition)) {
    const text = await $.fs
      .read(under(await rootOf($), condition))
      .catch(() => null);
    if (text === null) return `The plan file \`${condition}\` was not found.`;
    steps = planSteps(text);
    if (steps.length === 0)
      return `The plan file \`${condition}\` has no numbered step heading.`;
  }
  return createGoal(steps, controls, (await $.session.usage()).cost?.usd ?? 0);
};

/** The words that are a command only when they are all of the text after `/goal`. */
const WORDS = ["clear", "status", "pause", "resume", "skip"];

const answer: Handler<"command.run"> = async ($, e) => {
  const text = e.args.trim();
  const arg = /^step (\d+)$/.exec(text)?.[1] ?? "";
  const word = arg ? "step" : text;
  const [goal, now] = [await readGoal($), await $.clock.now()];
  if (word === "clear") {
    await writeGoal($, null);
    return { text: "Goal cleared." };
  }
  if (!word || word === "status") {
    return { text: goal ? statusText(goal, await spendOf($)) : "No goal." };
  }
  if (WORDS.includes(word) || word === "step") {
    if (!goal) return { text: "No goal." };
    const usd = goal.budget ? (await spendOf($)).usd : 0;
    const changed = change(goal, word, arg, now, usd);
    await writeGoal($, changed.goal);
    if (changed.goal && changed.start) begin($, changed.goal);
    return { text: changed.say };
  }
  const created = await newGoal($, e.args, now);
  if (typeof created === "string") return { text: created };
  await writeGoal($, created);
  begin($, created);
  return { text: `Goal set: ${created.steps.length} steps.` };
};

/**
 * `command.run` of `/goal`: answers in place of the built-in command, with no model turn.
 * `/goal`, `status`, `clear`, `pause`, `resume`, `skip`, `step N`, or a condition.
 * A failure answers with its message, because a failing hook would let the built-in command run.
 */
export const onCommand: Handler<"command.run"> = ($, e, next) =>
  Promise.resolve(answer($, e, next)).catch((error: Error) => ({
    text: `Goal: ${error.message}`,
  }));

/** `command.describe` of `/goal`: the typeahead and `/help` name the goal engine, because `onCommand` answers the command. */
export const onCommandDescribe: Handler<"command.describe"> = (_$, e, next) =>
  next({ ...e, description: DESCRIPTION });
