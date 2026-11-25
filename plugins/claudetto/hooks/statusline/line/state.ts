import { num, parse, rec, str } from "./input";

/** What the session is waiting on the person for: a permission prompt, a question, or their next prompt. */
export interface Waiting {
	readonly kind: "permission" | "question" | "input";
	/** The tool whose call raised the prompt; absent for `input`. */
	readonly tool?: string;
}

/** How a subagent ended, in `agent.report`'s words. */
export type AgentEnd = "completed" | "failed" | "stopped";

/** A subagent the engine started: running until its report, then kept a while as finished. */
export interface Agent {
	readonly id: string;
	readonly type: string;
	readonly description: string;
	/** Epoch milliseconds of the spawn. */
	readonly startedAt: number;
	/** Tool calls the agent started. */
	readonly tools: number;
	/** The tool call it started last, as `Read main.ts`. */
	readonly doing?: string;
	/** Epoch milliseconds of the report; set once it finished. */
	readonly endedAt?: number;
	readonly end?: AgentEnd;
}

/** A task of the session's list, from `TaskCreate`, `TaskUpdate`, or `TodoWrite`. */
export interface Task {
	readonly id: string;
	readonly subject: string;
	readonly status: "pending" | "in_progress" | "completed";
	/** The present-tense form the model gave for the task in progress. */
	readonly active?: string;
}

/**
 * What claudetto's hooks observed in one session, written to a small file the
 * status line command reads: stdin carries none of it.
 */
export interface LiveState {
	readonly phase: "working" | "idle";
	readonly waiting?: Waiting;
	/** The subagents running now, oldest first. */
	readonly agents: readonly Agent[];
	/** The subagents that finished since the lead's turn started, newest last. */
	readonly finished: readonly Agent[];
	/** Tool calls started in the session, by the lead and its subagents. */
	readonly tools: number;
	/** The lead's last tool call, as `Read main.ts`. */
	readonly doing?: string;
	readonly tasks: readonly Task[];
}

/** The state of a session that has seen no event yet. */
export const EMPTY_STATE: LiveState = {
	phase: "idle",
	agents: [],
	finished: [],
	tools: 0,
	tasks: []
};

/** The file holding `session`'s state under the Claude Code config folder `configDir`. */
export const statePath = (configDir: string, session: string): string =>
	`${configDir}/claudetto/status/${session.replaceAll(/[^\w.-]/gu, "_")}.json`;

const KINDS: ReadonlySet<string> = new Set(["permission", "question", "input"]);
const ENDS: ReadonlySet<string> = new Set(["completed", "failed", "stopped"]);
const STATUSES: ReadonlySet<string> = new Set([
	"pending",
	"in_progress",
	"completed"
]);

const isKind = (kind: string | undefined): kind is Waiting["kind"] =>
	kind !== undefined && KINDS.has(kind);

const isEnd = (end: string | undefined): end is AgentEnd =>
	end !== undefined && ENDS.has(end);

const isStatus = (status: string | undefined): status is Task["status"] =>
	status !== undefined && STATUSES.has(status);

const listOf = (value: unknown): readonly unknown[] =>
	Array.isArray(value) ? value : [];

const agentOf = (value: unknown): Agent | undefined => {
	const row = rec(value);
	const id = str(row?.["id"]);
	const startedAt = num(row?.["startedAt"]);
	if (row === undefined || id === undefined || startedAt === undefined) {
		return undefined;
	}
	const doing = str(row["doing"]);
	const endedAt = num(row["endedAt"]);
	const end = str(row["end"]);
	return {
		id,
		type: str(row["type"]) ?? "agent",
		description: str(row["description"]) ?? "",
		startedAt,
		tools: num(row["tools"]) ?? 0,
		...(doing === undefined ? {} : { doing }),
		...(endedAt === undefined ? {} : { endedAt }),
		...(isEnd(end) ? { end } : {})
	};
};

const taskOf = (value: unknown): Task | undefined => {
	const row = rec(value);
	const id = str(row?.["id"]);
	const subject = str(row?.["subject"]);
	const status = str(row?.["status"]);
	if (id === undefined || subject === undefined || !isStatus(status)) {
		return undefined;
	}
	const active = str(row?.["active"]);
	return { id, subject, status, ...(active === undefined ? {} : { active }) };
};

const waitingOf = (kind: string | undefined, tool: string | undefined) =>
	isKind(kind)
		? { waiting: { kind, ...(tool === undefined ? {} : { tool }) } }
		: {};

/** The state in `raw`; a file that is missing, not JSON, or not this shape reads as no state. */
export const readState = (raw: string | undefined): LiveState | undefined => {
	const found = raw === undefined ? undefined : parse(raw);
	if (found === undefined) {
		return undefined;
	}
	const doing = str(found["doing"]);
	return {
		phase: found["phase"] === "working" ? "working" : "idle",
		agents: listOf(found["agents"]).flatMap((item) => agentOf(item) ?? []),
		finished: listOf(found["finished"]).flatMap((item) => agentOf(item) ?? []),
		tools: num(found["tools"]) ?? 0,
		tasks: listOf(found["tasks"]).flatMap((item) => taskOf(item) ?? []),
		...(doing === undefined ? {} : { doing }),
		...waitingOf(str(found["waitingKind"]), str(found["waitingTool"]))
	};
};

/** The text a hook writes for `state`, in the flat shape `readState` reads. */
export const writeState = (state: LiveState): string =>
	JSON.stringify({
		phase: state.phase,
		waitingKind: state.waiting?.kind,
		waitingTool: state.waiting?.tool,
		agents: state.agents,
		finished: state.finished,
		tools: state.tools,
		doing: state.doing,
		tasks: state.tasks
	});
