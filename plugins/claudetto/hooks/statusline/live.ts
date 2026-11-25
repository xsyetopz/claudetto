import type { EngineInterface, On } from "claude-code";

import { configDir } from "../settings/settings";
import { fault } from "../shared/fault";
import { activityOf, tasksAfter } from "./activity";
import { baselinesAfter, partsOf } from "./baseline";
import {
	type Agent,
	EMPTY_STATE,
	type LiveState,
	statePath,
	type Waiting,
	writeState
} from "./line/state";

/** The tool that puts a question to the person, whatever the permission mode says about it. */
const QUESTION_TOOL = "AskUserQuestion";

/**
 * Matches every value of a string field. These hooks observe every event of their
 * kind, and the engine refuses a second unmatched hook on an event another module
 * already hooks, so each registers with a match-all key instead.
 */
const ANY = /^/u;

const ANY_TURN = { turnId: ANY } as const;

/** The state of one session; a hook instance is per session, so the holder lives in the registration. */
export interface Live {
	state: LiveState;
}

/** A holder for one session's state, before its first event. */
export const newLive = (): Live => ({ state: EMPTY_STATE });

/** Writes the state file of this session; a failed write is logged and never fails the hook. */
async function save($: EngineInterface, state: LiveState): Promise<void> {
	try {
		await $.fs.write(
			statePath(await configDir($), await $.session.id()),
			writeState(state)
		);
	} catch (error) {
		fault($, "status state", error);
	}
}

/** `current` with `waiting` as the prompt it waits on. */
const waitingOn = (current: LiveState, waiting: Waiting): LiveState => ({
	...current,
	waiting
});

/** `current` with no waiting prompt. */
const answered = (current: LiveState): LiveState => {
	const { waiting: _dropped, ...rest } = current;
	return rest;
};

/** `current` with no permission or question prompt: a tool that starts running was allowed, so the prompt is answered. */
const answeredCall = (current: LiveState): LiveState =>
	current.waiting !== undefined && current.waiting.kind !== "input"
		? answered(current)
		: current;

/** The most finished subagents kept for the line, a choice that bounds its height. */
const FINISHED_KEPT = 3;

/** `current` after a tool call started by the lead (`agentId` undefined) or by subagent `agentId`. */
const started = (
	current: LiveState,
	agentId: string | undefined,
	doing: string
): LiveState => ({
	...current,
	tools: current.tools + 1,
	...(agentId === undefined ? { doing } : {}),
	agents: current.agents.map((agent) =>
		agent.id === agentId ? { ...agent, tools: agent.tools + 1, doing } : agent
	)
});

/** The phase: working from a prompt until the turn ends, and then waiting on the next prompt. Subagent turns are skipped, since the lead's phase is the one shown. */
function registerPhase(on: On, live: Live): void {
	on("turn.start", ANY_TURN, async ($, e, next) => {
		if (e.agentId === undefined) {
			live.state = { ...answered(live.state), phase: "working", finished: [] };
			await save($, live.state);
		}
		return next(e);
	});
	on("turn.complete", ANY_TURN, async ($, e, next) => {
		if (e.agentId === undefined) {
			live.state = {
				...waitingOn(live.state, { kind: "input" }),
				phase: "idle"
			};
			await save($, live.state);
		}
		return next(e);
	});
}

/** The prompt a tool call raises, cleared when a tool starts running; each started call is counted and named, and a task call updates the list. */
function registerPrompt(on: On, live: Live): void {
	on("tool.check", { tool: ANY }, async ($, e, next) => {
		const verdict = await next(e);
		const asks = verdict.decision === "ask" && e.approver !== "host";
		if (e.tool_use_id !== undefined && (asks || e.tool === QUESTION_TOOL)) {
			live.state = waitingOn(live.state, {
				kind: e.tool === QUESTION_TOOL ? "question" : "permission",
				tool: e.tool
			});
			await save($, live.state);
		}
		return verdict;
	}).catch(($, e, next) => {
		fault($, "status tool check", next.error);
		return next(e);
	});
	on("tool.run", async ($, e, next) => {
		live.state = started(
			answeredCall(live.state),
			e.agentId,
			activityOf(e.tool, e)
		);
		await save($, live.state);
		const result = await next(e);
		const tasks = tasksAfter(live.state.tasks, e.tool, e, result.result);
		if (tasks !== undefined) {
			live.state = { ...live.state, tasks };
			await save($, live.state);
		}
		return result;
	}).catch(($, e, next) => {
		fault($, "status tool run", next.error);
		return next(e);
	});
}

/** The subagents: listed from their spawn until their report, then kept as finished until the lead's next turn; all dropped when the session ends so a resumed one never inherits them. */
function registerAgents(on: On, live: Live): void {
	on("agent.spawn", { subagentType: ANY }, async ($, e, next) => {
		const result = await next(e);
		if (result.agentId !== undefined) {
			const agent: Agent = {
				id: result.agentId,
				type: e.subagentType,
				description: e.description,
				startedAt: await $.clock.now(),
				tools: 0
			};
			live.state = { ...live.state, agents: [...live.state.agents, agent] };
			await save($, live.state);
		}
		return result;
	}).catch(($, e, next) => {
		fault($, "status agent spawn", next.error);
		return next(e);
	});
	on("agent.report", async ($, e, next) => {
		const endedAt = await $.clock.now();
		const done = live.state.agents.find((item) => item.id === e.agentId);
		const ended: Agent[] =
			done === undefined ? [] : [{ ...done, endedAt, end: e.status }];
		live.state = {
			...live.state,
			agents: live.state.agents.filter((agent) => agent.id !== e.agentId),
			finished: [...live.state.finished, ...ended].slice(-FINISHED_KEPT)
		};
		await save($, live.state);
		return next(e);
	}).catch(($, e, next) => {
		fault($, "status agent report", next.error);
		return next(e);
	});
	on("session.end", { sessionId: ANY }, async ($, e, next) => {
		live.state = EMPTY_STATE;
		await save($, live.state);
		return next(e);
	});
}

/**
 * The rate-limit baselines and the context rows: the windows as the session
 * starts, then at each measure (after each turn, and when a window moves a
 * point) the rows /context's free local estimate gives, and any window seen
 * for the first time or reset since. The band and the usage pane redraw.
 */
function registerMeasure(on: On, live: Live): void {
	// A failed usage read is logged here rather than thrown: the session.start
	// hooks upstream would otherwise report it as their own failure.
	on("session.start", { cwd: ANY }, async ($, e, next) => {
		try {
			const { rateLimits } = await $.session.usage();
			const now = await $.clock.now();
			live.state = {
				...live.state,
				limits: baselinesAfter(live.state.limits ?? [], rateLimits, now)
			};
			await save($, live.state);
		} catch (error) {
			fault($, "status session start", error);
		}
		return next(e);
	});
	on("session.measure", async ($, e, next) => {
		try {
			const usage = await $.session.usage({ breakdown: "summary" });
			const categories = usage.context.breakdown?.categories;
			const now = await $.clock.now();
			live.state = {
				...live.state,
				limits: baselinesAfter(live.state.limits ?? [], e.rateLimits, now),
				...(categories === undefined ? {} : { context: partsOf(categories) })
			};
			await save($, live.state);
			$.ui.invalidate("ui.render");
		} catch (error) {
			fault($, "status measure", error);
		}
		return next(e);
	});
}

/**
 * Writes what the hooks observe in one session to the file the status line
 * command reads (ADR-0201): the turn phase, the prompt the session waits on
 * the person for, the subagents with their tool calls, the lead's last tool
 * call, the task list, the context rows, and the rate-limit baselines. Each
 * change rewrites the whole file into `live`, which the usage pane reads too.
 */
export function registerLive(on: On, live: Live): void {
	registerPhase(on, live);
	registerPrompt(on, live);
	registerAgents(on, live);
	registerMeasure(on, live);
}
