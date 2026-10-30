import type {
	EngineInterface,
	HookFor,
	MatchedHook,
	SessionMessage,
	Timer,
} from "claude-code";
import { activeMark, CHECK_TIMEOUT_MS, goalArgs, outputTail } from "./goal.ts";
import {
	appliedTasks,
	isHeld,
	type LoopHeld,
	loopStep,
	nextOpen,
	progressOf,
} from "./loop.ts";
import {
	GOAL_CAP,
	GOAL_CLEARED,
	GOAL_DESCRIPTION,
	GOAL_LONG,
	GOAL_SET,
	GOAL_SLASH,
	GOAL_STATUS,
	LOOP,
	LOOP_CAP,
	RETRY,
	START,
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
	await $.state.set(goalRef, { check, setAt: await $.clock.now() });
	tick = $.clock.every(MINUTE_MS, () => $.ui.invalidate("ui.render"));
};

const goalAnswer = async (
	$: EngineInterface,
	args: string,
): Promise<{ text: string }> => {
	const held = (await $.state.get(goalRef)).value ?? null;
	const asked = goalArgs(args);
	switch (asked.kind) {
		case "status":
			return { text: GOAL_STATUS({ check: held?.check ?? null }) };
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
		argumentHint: "[<shell command> | clear]",
	});

type HintHook = MatchedHook<"ui.render", { readonly component: "PromptHint" }>;

/** `ui.render` of `PromptHint`: the built-in's active goal text, which only the built-in's own goal draws. */
export const onGoalHint: HintHook = async ($, e, next) => {
	const goal = (await $.state.get(goalRef)).value ?? null;
	if (goal === null) {
		return next(e);
	}
	const mark = activeMark((await $.clock.now()) - goal.setAt);
	const tail = `${e.props.tail ?? ""} · ${mark}`;
	return next({ ...e, props: { ...e.props, tail } });
};

/** The block reason of a failing goal check, or `undefined` with no goal, a pass, or the bound reached; the last two clear the goal. */
const goalBlock = async (
	$: EngineInterface,
	messages: readonly SessionMessage[],
): Promise<string | undefined> => {
	const goal = (await $.state.get(goalRef)).value ?? null;
	if (goal === null) {
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
		await setGoal($, null);
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
