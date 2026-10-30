import type {
	EngineInterface,
	HookFor,
	MatchedHook,
	SessionMessage,
	Timer,
} from "claude-code";
import {
	activeMark,
	CHECK_TIMEOUT_MS,
	type GoalUpdate,
	goalArgs,
	goalUpdate,
	outputTail,
} from "./goal.ts";
import {
	appliedTasks,
	isHeld,
	type LoopHeld,
	loopStep,
	nextOpen,
	progressOf,
} from "./loop.ts";
import {
	GOAL_BAD_INPUT,
	GOAL_CALL,
	GOAL_CAP,
	GOAL_CLEARED,
	GOAL_DESCRIPTION,
	GOAL_INPUT_SCHEMA,
	GOAL_LONG,
	GOAL_NONE,
	GOAL_RESUMED,
	GOAL_SET,
	GOAL_SLASH,
	GOAL_STATUS,
	GOAL_STOPPED,
	GOAL_TOOL,
	LOOP,
	LOOP_CAP,
	NO_PROGRESS,
	RETRY,
	START,
	TOOL_GOAL,
} from "./prompts.ts";

/** The most characters of the next task that a block quotes. */
const TASK_CHARS = 200;

const loopRef = { plugin: "claudetto", key: "loop" } as const;
const goalRef = { plugin: "claudetto", key: "goal" } as const;
const heldRef = { plugin: "claudetto", key: "goalHeld" } as const;
const FRESH: LoopHeld = { count: 0, seen: "" };
const MINUTE_MS = 60_000;

// The hint shows the goal's age in minutes, and a drawing is kept until something invalidates it.
let tick: Timer | undefined;

const readGoal = async ($: EngineInterface) =>
	(await $.state.get(goalRef)).value ?? null;

const setGoal = async (
	$: EngineInterface,
	check: string | null,
): Promise<void> => {
	tick?.cancel();
	tick = undefined;
	await $.state.set(heldRef, FRESH);
	if (check === null) {
		await $.state.set(goalRef, null);
		return;
	}
	const setAt = await $.clock.now();
	await $.state.set(goalRef, { check, setAt, status: "active", reason: "" });
	tick = $.clock.every(MINUTE_MS, () => $.ui.invalidate("ui.render"));
	// The tool stays for the rest of the session once registered, so a second goal finds it there.
	await $.tool
		.register({
			name: GOAL_TOOL,
			description: TOOL_GOAL,
			inputSchema: GOAL_INPUT_SCHEMA,
		})
		.catch(() => undefined);
};

/** Keeps the goal and its command but stops its checks, until `/goal resume`. */
const stopGoal = async (
	$: EngineInterface,
	update: GoalUpdate,
): Promise<string> => {
	const goal = await readGoal($);
	if (goal === null) {
		return GOAL_NONE;
	}
	tick?.cancel();
	tick = undefined;
	await $.state.set(heldRef, FRESH);
	await $.state.set(goalRef, { ...goal, ...update });
	await $.ui.invalidate("ui.render");
	return GOAL_STOPPED({ check: goal.check, ...update });
};

const resumeGoal = async ($: EngineInterface): Promise<string> => {
	const goal = await readGoal($);
	if (goal === null || goal.status === "active") {
		return GOAL_STATUS({ check: goal?.check ?? null });
	}
	await setGoal($, goal.check);
	return GOAL_RESUMED({ check: goal.check });
};

const goalAnswer = async (
	$: EngineInterface,
	args: string,
): Promise<{ text: string }> => {
	const held = await readGoal($);
	const asked = goalArgs(args);
	switch (asked.kind) {
		case "status":
			return {
				text:
					held === null || held.status === "active"
						? GOAL_STATUS({ check: held?.check ?? null })
						: GOAL_STOPPED({ ...held, status: held.status }),
			};
		case "resume":
			return { text: await resumeGoal($) };
		case "clear":
			await setGoal($, null);
			return { text: GOAL_CLEARED({ check: held?.check ?? null }) };
		case "slash":
			return { text: GOAL_SLASH({ check: asked.check }) };
		case "long":
			return { text: GOAL_LONG({ length: asked.length }) };
		default:
	}
	await setGoal($, asked.check);
	// A `command.run` answer only prints, so the work starts from a prompt sent after the hook.
	$.clock.after(0, () => {
		$.prompt
			.submit({ text: START({ check: asked.check }) })
			.catch(() => undefined);
	});
	return { text: GOAL_SET({ check: asked.check }) };
};

/** `command.run` of `/goal`: answers in place of the built-in. A fault answers with its message, because a failing hook lets the built-in run. */
export const onGoalCommand: HookFor<"command.run"> = async ($, e) => {
	try {
		return await goalAnswer($, e.args);
	} catch (error) {
		return { text: `Goal: ${String(error)}` };
	}
};

/** `command.describe` of `/goal`: the typeahead names a shell command, not a condition. */
export const onGoalDescribe: HookFor<"command.describe"> = (_$, e, next) =>
	next({
		...e,
		description: GOAL_DESCRIPTION,
		argumentHint: "[<shell command> | clear | resume]",
	});

/** A matcher on the one tool keeps every other tool call out of the hook. */
export const GOAL_MATCH = { tool: [GOAL_CALL] } as const;

/** `tool.call` of the goal tool: the root agent pauses or blocks the goal, and a bad input changes nothing. */
export const onGoalTool: MatchedHook<"tool.call", typeof GOAL_MATCH> = async (
	$,
	e,
) => {
	const update = goalUpdate(e);
	return {
		result: update === undefined ? GOAL_BAD_INPUT : await stopGoal($, update),
	};
};

type HintHook = MatchedHook<"ui.render", { readonly component: "PromptHint" }>;

/** `ui.render` of `PromptHint`: the goal mark that the engine draws only for its own goal. */
export const onGoalHint: HintHook = async ($, e, next) => {
	const goal = await readGoal($);
	if (goal === null) {
		return next(e);
	}
	const mark = activeMark((await $.clock.now()) - goal.setAt, goal.status);
	const tail = `${e.props.tail ?? ""} · ${mark}`;
	return next({ ...e, props: { ...e.props, tail } });
};

/** The block reason of a failing goal check, or `undefined` with no active goal, a pass, which clears the goal, or the bound reached, which marks it blocked. */
const goalBlock = async (
	$: EngineInterface,
	messages: readonly SessionMessage[],
): Promise<string | undefined> => {
	const goal = await readGoal($);
	if (goal?.status !== "active") {
		return undefined;
	}
	const run = await $.process
		.run(["sh", "-c", goal.check], {
			cwd: await $.session.root(),
			timeoutMs: CHECK_TIMEOUT_MS,
		})
		.catch((error: unknown) => ({
			exitCode: 1,
			stdout: "",
			stderr: String(error),
		}));
	if (run.exitCode === 0) {
		await setGoal($, null);
		return undefined;
	}
	const held = (await $.state.get(heldRef)).value;
	const step = loopStep(
		isHeld(held) ? held : undefined,
		progressOf(messages, "goal"),
	);
	if (!step.block) {
		await stopGoal($, { status: "blocked", reason: NO_PROGRESS });
		$.ui.log(GOAL_CAP({ check: goal.check }));
		return undefined;
	}
	await $.state.set(heldRef, step.held);
	return RETRY({
		check: goal.check,
		output: outputTail(run.stdout, run.stderr),
	});
};

const firstOpen = async (
	$: EngineInterface,
	files: readonly string[],
): Promise<{ id: string; task: string } | undefined> => {
	// A missing file has no open box, and the next file may.
	const texts = await Promise.all(
		files.map((file) => $.fs.read(file).catch(() => "")),
	);
	return texts.map(nextOpen).find((open) => open !== undefined);
};

/** The block reason while an applied OpenSpec change's `tasks.md` has an open box, or `undefined`. */
const loopBlock = async (
	$: EngineInterface,
	messages: readonly SessionMessage[],
): Promise<string | undefined> => {
	const open = await firstOpen($, appliedTasks(messages));
	if (open === undefined) {
		return undefined;
	}
	const held = (await $.state.get(loopRef)).value;
	const step = loopStep(
		isHeld(held) ? held : undefined,
		progressOf(messages, open.id),
	);
	await $.state.set(loopRef, step.held);
	if (!step.block) {
		$.ui.log(LOOP_CAP({ id: open.id }));
		return undefined;
	}
	return LOOP({ id: open.id, task: open.task.slice(0, TASK_CHARS) });
};

/** `classic.Stop`: a failing `/goal` check blocks first, then an open box of an applied change's `tasks.md`. A background task in flight lets the stop through, since its notice wakes the session. */
export const onFinishStop: HookFor<"classic.Stop"> = async ($, e, next) => {
	const answer = await next(e);
	if (answer.block !== undefined || (e.background_tasks ?? []).length > 0) {
		return answer;
	}
	try {
		const messages = await $.session.messages();
		const block =
			(await goalBlock($, messages)) ?? (await loopBlock($, messages));
		return block === undefined ? answer : { ...answer, block };
	} catch {
		// The loop is a help, so a fault of it adds no block.
		return answer;
	}
};
