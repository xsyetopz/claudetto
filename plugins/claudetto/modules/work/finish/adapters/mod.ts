// The mod handlers of the `finish` slice, with no model call:
// `/goal` sets one check command, and `Stop` blocks the stop until the check exits `0`, up to `GOAL_BLOCKS_MAX` times in a row.
// `Stop` also blocks after a ticked box of a `tasks.md` with an open box left, in a `/claudetto:apply` session with no agent in flight.
// `Stop` sets a note for `notes` when the reply defers work, says "done" with no proof, or has a heading in the wrong case, and never blocks for a note.
// The `box` hook denies a task box that changes to checked with no passed check in the session.
// Each path starts at the project root, because `$.fs` resolves a relative path against the folder of the shell.

import type { EngineInterface, MatchedHook } from "claude-code";
import type { Handler } from "../../../../kernel/hooks.ts";
import { passedChecks, proven } from "../../../project/domain/checks.ts";
import { GOAL_FILE } from "../../../project/domain/paths.ts";
import { projectRoot } from "../../../project/domain/session.ts";
import { sessionCost } from "../../../session/domain/usage.ts";
import {
	checkOf,
	type Goal,
	isSlashCommand,
	parseGoal,
} from "../domain/state.ts";
import { ticked } from "../domain/tasks.ts";
import {
	GOAL_BLOCKS_MAX,
	LOOP_TASK_CHARS,
	OUTPUT_TAIL_CHARS,
	RUN_TIMEOUT_MS,
} from "../limits.ts";
import {
	BOX_DENY,
	GOAL_CAP,
	LOOP,
	LOOP_CAP,
	NOT_A_CHECK,
	RETRY,
	START,
	UNCHECKED,
} from "../prompts.ts";
import {
	missingCheck,
	openTask,
	type Ports,
	raiseNote,
} from "./stop-checks.ts";

const TRAILING_SLASHES = /\/+$/;

/** The project root: `CLAUDE_PROJECT_DIR`, or the root of the session, or `""` with no root. */
const rootOf = ($: EngineInterface): Promise<string> =>
	projectRoot({
		dir: () => $.env.get("CLAUDE_PROJECT_DIR"),
		root: () => $.session.root(),
	});

const fileOf = async ($: EngineInterface) => {
	const root = await rootOf($);
	return root
		? `${root.replace(TRAILING_SLASHES, "")}/${GOAL_FILE}`
		: GOAL_FILE;
};

const readGoal = async ($: EngineInterface): Promise<Goal | null> => {
	const file = await fileOf($);
	try {
		return parseGoal(await $.fs.read(file));
	} catch {
		return null;
	}
};

const writeGoal = async ($: EngineInterface, goal: Goal | null) =>
	$.fs.write(await fileOf($), JSON.stringify(goal));

const inRoot = async (
	$: EngineInterface,
	argv: string[],
	timeoutMs: number,
) => {
	const root = await rootOf($);
	return $.process.run(argv, { ...(root ? { cwd: root } : {}), timeoutMs });
};

/** The reads of the session for the checks of a `Stop`. */
const portsOf = ($: EngineInterface): Ports => ({
	messages: () => $.session.messages(),
	agents: () => $.agent.list(),
	read: (file) => $.fs.read(file),
	exists: (file) => $.fs.exists(file),
	root: () => rootOf($),
	raise: (note) => $.state.set({ plugin: "claudetto", key: "note" }, note),
});

/** Runs `command` with `sh -c` in the project root: `pass` on exit 0, and the last `OUTPUT_TAIL_CHARS` characters of the output. */
export const runCheck = async (
	$: EngineInterface,
	command: string,
): Promise<{ pass: boolean; output: string }> => {
	const run = await inRoot($, ["sh", "-c", command], RUN_TIMEOUT_MS).catch(
		(error: Error) => ({ exitCode: 1, stdout: "", stderr: error.message }),
	);
	const output = (run.stdout + run.stderr).trim().slice(-OUTPUT_TAIL_CHARS);
	return { pass: run.exitCode === 0, output };
};

// The re-blocks in a row live in the `$.state` (X21), the loop count apart from the `/goal` count, and the note goes to `notes`.
const blocksRef = { plugin: "claudetto", key: "goalBlocks" } as const;
const loopRef = { plugin: "claudetto", key: "loopBlocks" } as const;

const setBlocks = ($: EngineInterface, count: number) =>
	$.state.set(blocksRef, count);

/** `classic.Stop`: a goal check that fails blocks the stop with its output, a turn that ticked a box with an open task left blocks the same way (the goal first), each at most `GOAL_BLOCKS_MAX` times in a row. Then a turn with an edit and no passed check after it blocks one time. A stop that nothing blocks sets a note. */
export const onStop: Handler<"classic.Stop"> = async ($, e, next) => {
	const goal = await readGoal($);
	if (goal) {
		const { pass, output } = await runCheck($, goal.check);
		if (pass) {
			await writeGoal($, null);
			await setBlocks($, 0);
		} else {
			const count = (await $.state.get(blocksRef)).value ?? 0;
			if (count < GOAL_BLOCKS_MAX) {
				await setBlocks($, count + 1);
				return {
					...(await next(e)),
					block: RETRY({ check: goal.check, output }),
				};
			}
			await setBlocks($, 0);
			$.ui.log(GOAL_CAP({ check: goal.check, count }));
		}
	}
	const open = await openTask(portsOf($));
	const loops = (await $.state.get(loopRef)).value ?? 0;
	if (open !== null && loops < GOAL_BLOCKS_MAX) {
		await $.state.set(loopRef, loops + 1);
		return {
			...(await next(e)),
			block: LOOP({
				id: open.id,
				task: open.task.slice(0, LOOP_TASK_CHARS),
			}),
		};
	}
	if (open !== null) {
		$.ui.log(LOOP_CAP({ count: loops }));
	}
	if (loops > 0) {
		await $.state.set(loopRef, 0);
	}
	const checks = await missingCheck(portsOf($), e.stop_hook_active);
	if (checks.length > 0) {
		return { ...(await next(e)), block: UNCHECKED({ checks }) };
	}
	await raiseNote(portsOf($), e.last_assistant_message ?? "");
	return next(e);
};

/** The usage value that `prompt` keeps from `session.measure`, which holds the first share of each window. */
const usageRef = { plugin: "claudetto", key: "usage" } as const;

/** The cost report for the model after a tick, or `undefined` with no figure or a fault of the read. */
const costOf = async ($: EngineInterface): Promise<string | undefined> => {
	const report = await sessionCost({
		usage: () => $.session.usage(),
		state: () => $.state.get(usageRef),
	});
	return report === "none" ? undefined : report;
};

type BoxHook = MatchedHook<
	"tool.call",
	{ readonly tool: readonly ["Edit", "Write"] }
>;

/** `tool.call` on `Edit` and `Write` of a `tasks.md`: a box that changes to checked needs a passed check in the transcript of the caller. A tick that goes through adds the cost report as context, so the final report of `apply` has its figures. */
export const onBoxCall: BoxHook = async ($, e, next) => {
	if (!e.file_path.endsWith("tasks.md")) {
		return next(e);
	}
	const before = (await $.fs.exists(e.file_path))
		? await $.fs.read(e.file_path)
		: "";
	let after: string;
	if ("content" in e) {
		after = e.content;
	} else if (e.replace_all) {
		after = before.replaceAll(e.old_string, e.new_string);
	} else {
		after = before.replace(e.old_string, () => e.new_string);
	}
	const opened = ticked(before, after);
	if (opened.length === 0) {
		return next(e);
	}
	const found =
		e.agentId === undefined
			? await $.session.messages()
			: await $.session.messages({ agentId: e.agentId });
	// A subagent that the session cannot read has no record to check against, so the call runs.
	if (!Array.isArray(found)) {
		return next(e);
	}
	const passed = passedChecks(found);
	const missing = opened.filter(({ line }) => !proven(line, passed));
	if (missing.length > 0) {
		return { deny: BOX_DENY({ ids: missing.map(({ id }) => id).join(", ") }) };
	}
	const answer = await next(e);
	if (answer.deny !== undefined) {
		return answer;
	}
	const report = await costOf($);
	return report === undefined
		? answer
		: { ...answer, context: [...(answer.context ?? []), report] };
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
	if (isSlashCommand(check)) {
		return { text: NOT_A_CHECK({ check }) };
	}
	await writeGoal($, { check });
	// Claude Code refuses `$.prompt.submit` in a `command.run` hook (see the header of `modules/session/handoff/adapters/mod.ts`), so a timer runs it after the hook.
	$.clock.after(
		0,
		() =>
			void $.prompt.submit({ text: START({ check }) }).catch(() => undefined),
	);
	return { text: `Goal set: \`${check}\` must exit 0.` };
};

/** `command.run` of `/goal` (`status`, `clear`, or a check command): answers in place of the built-in command. A failure answers with its message, because a failing hook would let the built-in command run. */
export const onCommand: Handler<"command.run"> = ($, e, next) =>
	Promise.resolve(answer($, e, next)).catch((error: Error) => ({
		text: `Goal: ${error.message}`,
	}));
