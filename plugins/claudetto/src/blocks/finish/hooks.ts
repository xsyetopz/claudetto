import type { EngineInterface, HookFor, SessionMessage } from "claude-code";
import {
	appliedTasks,
	isHeld,
	loopStep,
	nextOpen,
	progressOf,
} from "./loop.ts";
import { LOOP, LOOP_CAP } from "./prompts.ts";

/** The most characters of the next task that a block quotes. */
const TASK_CHARS = 200;

const loopRef = { plugin: "claudetto", key: "loop" } as const;

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

/** `classic.Stop`: an open box of an applied change's `tasks.md` blocks. A background task in flight lets the stop through, since its notice wakes the session. */
export const onFinishStop: HookFor<"classic.Stop"> = async ($, e, next) => {
	const answer = await next(e);
	if (answer.block !== undefined || (e.background_tasks ?? []).length > 0) {
		return answer;
	}
	try {
		const block = await loopBlock($, await $.session.messages());
		return block === undefined ? answer : { ...answer, block };
	} catch {
		// The loop is a help, so a fault of it adds no block.
		return answer;
	}
};
