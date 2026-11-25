import { type Ctx, type Text, words } from "./ctx";
import { bar, span } from "./format";
import { num, sub } from "./input";
import type { Agent, Task, Waiting } from "./state";

/** The longest agent description or task subject shown, a choice that keeps one to part of a row. */
const ABOUT_MAX = 40;
/** The most agent rows shown; the rest count as `+N more`. A choice that bounds the height of the line. */
const AGENT_ROWS = 3;
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

/** `⏵ 2 agents 1 done`: the subagents running now and those finished this turn. */
const agentCountText = ({ state, paint }: Ctx): Text => {
	const running = state?.agents.length ?? 0;
	const done = state?.finished.length ?? 0;
	if (running === 0 && done === 0) {
		return undefined;
	}
	return words(
		paint.agent(`⏵ ${running} ${running === 1 ? "agent" : "agents"}`),
		done > 0 && paint.dim(`${done} done`)
	);
};

/** `▸ Read main.ts`: the lead's last tool call while a turn runs. */
const doingText = ({ state, paint }: Ctx): Text =>
	state?.phase === "working" && state.doing !== undefined
		? paint.dim(`▸ ${state.doing}`)
		: undefined;

/** The activity row's items: tool calls, agents, and what the lead does now. */
export const activityTexts = (ctx: Ctx): Text[] => [
	toolsText(ctx),
	agentCountText(ctx),
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
	if (kind === "input") {
		return "your next prompt";
	}
	if (kind === "question") {
		return "an answer";
	}
	return `permission${tool === undefined ? "" : ` for ${tool}`}`;
};

/** `⚑ waiting on you: permission for Bash`, from the prompt a hook saw the engine raise. */
export const waitingText = ({ state, paint }: Ctx): Text => {
	const waiting = state?.waiting;
	return waiting === undefined
		? undefined
		: paint.alert(`⚑ waiting on you: ${waitingWhat(waiting)}`);
};

const agentRow = (agent: Agent, { paint, now }: Ctx): string => {
	const ended = agent.endedAt !== undefined;
	const mark = ((): string => {
		if (!ended) {
			return paint.agent("●");
		}
		return agent.end === "completed" ? paint.ok("✓") : paint.bad("✗");
	})();
	return words(
		mark,
		paint.bold(agent.type),
		agent.description !== "" && paint.dim(cut(agent.description)),
		paint.dim(span((agent.endedAt ?? now) - agent.startedAt)),
		paint.dim(`· ${agent.tools} tools`),
		!ended && agent.doing !== undefined && paint.dim(`· ▸ ${agent.doing}`)
	);
};

/** One row per subagent, running ones first and then those finished this turn, with the rest counted. */
export const agentRows = (ctx: Ctx): string[] => {
	const all = [...(ctx.state?.agents ?? []), ...(ctx.state?.finished ?? [])];
	const more = all.length - AGENT_ROWS;
	return [
		...all.slice(0, AGENT_ROWS).map((agent) => agentRow(agent, ctx)),
		...(more > 0 ? [ctx.paint.dim(`  +${more} more`)] : [])
	];
};
