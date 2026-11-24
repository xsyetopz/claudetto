import { num, parse, rec, str } from "./input";

/** What the session is waiting on the person for: a permission prompt, a question, or their next prompt. */
export interface Waiting {
	readonly kind: "permission" | "question" | "input";
	/** The tool whose call raised the prompt; absent for `input`. */
	readonly tool?: string;
}

/** A subagent the engine started and has not reported on yet. */
export interface Agent {
	readonly id: string;
	readonly type: string;
	readonly description: string;
	/** Epoch milliseconds of the spawn. */
	readonly startedAt: number;
}

/**
 * What claudetto's hooks observed in one session, written to a small file the
 * status line command reads: stdin carries none of it.
 */
export interface LiveState {
	readonly phase: "working" | "idle";
	readonly waiting?: Waiting;
	readonly agents: readonly Agent[];
}

/** The state of a session that has seen no event yet. */
export const EMPTY_STATE: LiveState = { phase: "idle", agents: [] };

/** The file holding `session`'s state under the Claude Code config folder `configDir`. */
export const statePath = (configDir: string, session: string): string =>
	`${configDir}/claudetto/status/${session.replaceAll(/[^\w.-]/gu, "_")}.json`;

const KINDS: ReadonlySet<string> = new Set(["permission", "question", "input"]);

const isKind = (kind: string | undefined): kind is Waiting["kind"] =>
	kind !== undefined && KINDS.has(kind);

const agentOf = (value: unknown): Agent | undefined => {
	const row = rec(value);
	if (row === undefined) {
		return undefined;
	}
	const id = str(row["id"]);
	const startedAt = num(row["startedAt"]);
	return id === undefined || startedAt === undefined
		? undefined
		: {
				id,
				type: str(row["type"]) ?? "agent",
				description: str(row["description"]) ?? "",
				startedAt
			};
};

/** The state in `raw`; a file that is missing, not JSON, or not this shape reads as no state. */
export const readState = (raw: string | undefined): LiveState | undefined => {
	const found = raw === undefined ? undefined : parse(raw);
	if (found === undefined) {
		return undefined;
	}
	const kind = str(found["waitingKind"]);
	const tool = str(found["waitingTool"]);
	const list: readonly unknown[] = Array.isArray(found["agents"])
		? found["agents"]
		: [];
	return {
		phase: found["phase"] === "working" ? "working" : "idle",
		agents: list.flatMap((item) => agentOf(item) ?? []),
		...(isKind(kind)
			? {
					waiting: {
						kind,
						...(tool === undefined ? {} : { tool })
					}
				}
			: {})
	};
};

/** The text a hook writes for `state`, in the flat shape `readState` reads. */
export const writeState = (state: LiveState): string =>
	JSON.stringify({
		phase: state.phase,
		waitingKind: state.waiting?.kind,
		waitingTool: state.waiting?.tool,
		agents: state.agents
	});
