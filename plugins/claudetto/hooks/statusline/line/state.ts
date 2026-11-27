import { num, parse, rec, str } from "./input";

/** A task of the session's list, from `TaskCreate`, `TaskUpdate`, or `TodoWrite`. */
export interface Task {
	readonly id: string;
	readonly subject: string;
	readonly status: "pending" | "in_progress" | "completed";
	/** The present-tense form the model gave for the task in progress. */
	readonly active?: string;
}

/** One row of the context breakdown the window holds: its /context colour key and its tokens. */
export interface ContextPart {
	readonly color: string;
	readonly tokens: number;
}

/**
 * The use of a rate-limit window when this session first saw it, so the line
 * can tell earlier use from the use since. A window that resets during the
 * session starts over at 0: all of the new window came after the start.
 */
export interface Baseline {
	/** The window's name in `rate_limits`, as `five_hour`. */
	readonly kind: string;
	/** Percent used at `since`. */
	readonly before: number;
	/** Epoch seconds of the window's reset as last seen. */
	readonly resetsAt?: number;
	/** Epoch milliseconds of the first reading. */
	readonly since: number;
}

/**
 * What claudetto's hooks observed in one session, written to a small file the
 * status line command reads: stdin carries none of it.
 */
export interface LiveState {
	/** Tool calls started in the session, by the lead and its subagents. */
	readonly tools: number;
	readonly tasks: readonly Task[];
	/** The rows of the context window by /context's local estimate at the last measure, `used` rows only. */
	readonly context?: readonly ContextPart[];
	/** The window /context measures against at the last measure: the model's, or a smaller compaction window (`autoCompactWindow`). */
	readonly window?: number;
	/** The rate-limit windows as the session first saw them. */
	readonly limits?: readonly Baseline[];
}

/** The state of a session that has seen no event yet. */
export const EMPTY_STATE: LiveState = {
	tools: 0,
	tasks: []
};

/** The file holding `session`'s state under the Claude Code config folder `configDir`. */
export const statePath = (configDir: string, session: string): string =>
	`${configDir}/claudetto/status/${session.replaceAll(/[^\w.-]/gu, "_")}.json`;

const STATUSES: ReadonlySet<string> = new Set([
	"pending",
	"in_progress",
	"completed"
]);

const isStatus = (status: string | undefined): status is Task["status"] =>
	status !== undefined && STATUSES.has(status);

const listOf = (value: unknown): readonly unknown[] =>
	Array.isArray(value) ? value : [];

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

const partOf = (value: unknown): ContextPart | undefined => {
	const row = rec(value);
	const color = str(row?.["color"]);
	const tokens = num(row?.["tokens"]);
	return color === undefined || tokens === undefined
		? undefined
		: { color, tokens };
};

const baselineOf = (value: unknown): Baseline | undefined => {
	const row = rec(value);
	const kind = str(row?.["kind"]);
	const before = num(row?.["before"]);
	const since = num(row?.["since"]);
	if (kind === undefined || before === undefined || since === undefined) {
		return undefined;
	}
	const resetsAt = num(row?.["resetsAt"]);
	return {
		kind,
		before,
		since,
		...(resetsAt === undefined ? {} : { resetsAt })
	};
};

/** The state in `raw`; a file that is missing, not JSON, or not this shape reads as no state. */
export const readState = (raw: string | undefined): LiveState | undefined => {
	const found = raw === undefined ? undefined : parse(raw);
	if (found === undefined) {
		return undefined;
	}
	const window = num(found["window"]);
	return {
		tools: num(found["tools"]) ?? 0,
		tasks: listOf(found["tasks"]).flatMap((item) => taskOf(item) ?? []),
		...(window === undefined || window <= 0 ? {} : { window }),
		...(Array.isArray(found["context"])
			? {
					context: listOf(found["context"]).flatMap(
						(item) => partOf(item) ?? []
					)
				}
			: {}),
		...(Array.isArray(found["limits"])
			? {
					limits: listOf(found["limits"]).flatMap(
						(item) => baselineOf(item) ?? []
					)
				}
			: {})
	};
};

/** The text a hook writes for `state`, in the flat shape `readState` reads. */
export const writeState = (state: LiveState): string =>
	JSON.stringify({
		tools: state.tools,
		tasks: state.tasks,
		context: state.context,
		window: state.window,
		limits: state.limits
	});
