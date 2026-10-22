// The mod handlers of the `goal` slice: `/goal` sets one check command, and the `Stop` hook blocks the stop until the check exits `0`.
// The hooks run no model.
// Each path starts at the project root, because `$.fs` resolves a relative path against the folder of the shell.

import type { EngineInterface } from "claude-code";
import { GOAL_FILE } from "../../../kernel/paths.ts";
import type { Handler } from "../../../kernel/slice.ts";
import { checkOf, type Goal, parseGoal } from "../domain/state.ts";
import { OUTPUT_TAIL_CHARS, RUN_TIMEOUT_MS } from "../limits.ts";
import { RETRY, START } from "../prompts.ts";

/** The project root: `CLAUDE_PROJECT_DIR`, or the root of the session, or `""` with no root. */
const rootOf = async ($: EngineInterface): Promise<string> =>
  (await $.env.get("CLAUDE_PROJECT_DIR").catch(() => undefined)) ||
  (await $.session.root().catch(() => ""));

const fileOf = async ($: EngineInterface) => {
  const root = await rootOf($);
  return root ? `${root.replace(/\/+$/, "")}/${GOAL_FILE}` : GOAL_FILE;
};

export const readGoal = async ($: EngineInterface): Promise<Goal | null> =>
  $.fs.read(await fileOf($)).then(parseGoal, () => null);

const writeGoal = async ($: EngineInterface, goal: Goal | null) =>
  $.fs.write(await fileOf($), JSON.stringify(goal));

/** Runs `command` with `sh -c` in the project root: `pass` on exit 0, and the last `OUTPUT_TAIL_CHARS` characters of the output. */
export const runCheck = async (
  $: EngineInterface,
  command: string,
): Promise<{ pass: boolean; output: string }> => {
  const root = await rootOf($);
  const run = await $.process
    .run(["sh", "-c", command], {
      ...(root ? { cwd: root } : {}),
      timeoutMs: RUN_TIMEOUT_MS,
    })
    .catch((error: Error) => ({
      exitCode: 1,
      stdout: "",
      stderr: error.message,
    }));
  const output = (run.stdout + run.stderr).trim().slice(-OUTPUT_TAIL_CHARS);
  return { pass: run.exitCode === 0, output };
};

/** `classic.Stop`: with a goal, runs the check. A pass clears the goal and lets the stop go on. A fail blocks the stop with the output. */
export const onStop: Handler<"classic.Stop"> = async ($, e, next) => {
  const goal = await readGoal($);
  if (!goal) return next(e);
  const { pass, output } = await runCheck($, goal.check);
  if (pass) {
    await writeGoal($, null);
    return next(e);
  }
  return { ...(await next(e)), block: RETRY({ check: goal.check, output }) };
};

const answer: Handler<"command.run"> = async ($, e) => {
  const text = e.args.trim();
  const goal = await readGoal($);
  if (!text || text === "status") {
    return { text: goal ? `Goal: \`${goal.check}\` must exit 0.` : "No goal." };
  }
  if (text === "clear") {
    await writeGoal($, null);
    return { text: "Goal cleared." };
  }
  const check = checkOf(text);
  await writeGoal($, { check });
  // Claude Code refuses `$.prompt.submit` in a `command.run` hook (see the header of `slices/handoff/adapters/mod.ts`), so a timer runs it after the hook.
  $.clock.after(
    0,
    () => void $.prompt.submit({ text: START({ check }) }).catch(() => {}),
  );
  return { text: `Goal set: \`${check}\` must exit 0.` };
};

/**
 * `command.run` of `/goal`: answers in place of the built-in command, with no model turn.
 * `/goal`, `status`, `clear`, or a check command.
 * A failure answers with its message, because a failing hook would let the built-in command run.
 */
export const onCommand: Handler<"command.run"> = ($, e, next) =>
  Promise.resolve(answer($, e, next)).catch((error: Error) => ({
    text: `Goal: ${error.message}`,
  }));
