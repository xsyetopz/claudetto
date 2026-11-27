import { type Ctx, type Text, words } from "./ctx";
import { bar } from "./format";
import { num, sub } from "./input";
import type { Task, Waiting } from "./state";

/** The longest task subject shown, a choice that keeps one to part of a row. */
const ABOUT_MAX = 40;
/** Cells in the task bar, half a use bar so the row keeps room for the task. */
const TASK_CELLS = 5;
const MS_PER_MIN = 60_000;

const cut = (text: string): string =>
	text.length > ABOUT_MAX ? `${text.slice(0, ABOUT_MAX - 1)}…` : text;

/** `⚒ 42 tools 3.5/min`, the rate over the session's wall time. */
const toolsText = ({ input, state, paint }: Ctx): Text => {
	if (state === undefined || state.tools === 0) {
		return undefined;
	}
	const ms = num(sub(input, "cost")?.["total_duration_ms"]);
	const rate =
		ms === undefined || ms < MS_PER_MIN
			? undefined
			: (state.tools / (ms / MS_PER_MIN)).toFixed(1);
	return words(
		paint.info(`⚒ ${state.tools} tools`),
		rate !== undefined && paint.dim(`${rate}/min`)
	);
};

/** `▸ Read main.ts`: the lead's last tool call while a turn runs. */
const doingText = ({ state, paint }: Ctx): Text =>
	state?.phase === "working" && state.doing !== undefined
		? paint.dim(`▸ ${state.doing}`)
		: undefined;

/** The activity row's items: tool calls and what the lead does now; Claude Code's footer counts the agents. */
export const activityTexts = (ctx: Ctx): Text[] => [
	toolsText(ctx),
	doingText(ctx)
];

const TASK_MARK: Readonly<Record<Task["status"], string>> = {
	completed: "✓",
	in_progress: "◐",
	pending: "○"
};

/** `☑ 2/7 ██░░░ ◐ Writing tests`: done of all, then the task in progress, else the next one pending. */
export const tasksText = ({ state, paint }: Ctx): Text => {
	const tasks = state?.tasks ?? [];
	if (tasks.length === 0) {
		return undefined;
	}
	const done = tasks.filter((task) => task.status === "completed").length;
	const focus =
		tasks.find((task) => task.status === "in_progress") ??
		tasks.find((task) => task.status === "pending");
	return words(
		paint.info(`☑ ${done}/${tasks.length}`),
		bar((100 * done) / tasks.length, paint, TASK_CELLS),
		focus !== undefined &&
			`${paint.warn(TASK_MARK[focus.status])} ${cut(focus.active ?? focus.subject)}`
	);
};

const waitingWhat = ({ kind, tool }: Waiting): string => {
	if (kind === "question") {
		return "an answer";
	}
	return `permission${tool === undefined ? "" : ` for ${tool}`}`;
};

/**
 * `⚑ waiting on you: permission for Bash`, from the dialog or question a hook
 * saw the engine raise. The next prompt gets no row: Claude Code's own prompt shows it, and a flag on it
 * reads as a step the user owes while a background shell or subagent is still working.
 */
export const waitingText = ({ state, paint }: Ctx): Text => {
	const waiting = state?.waiting;
	return waiting === undefined || waiting.kind === "input"
		? undefined
		: paint.alert(`⚑ waiting on you: ${waitingWhat(waiting)}`);
};
