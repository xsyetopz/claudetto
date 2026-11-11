import type {
	CallAnswer,
	CallEvent,
	CallNext,
	CheckAnswer,
	CheckEvent,
	CheckNext,
} from "../chain.ts";
import { isWriter } from "../tools.ts";

/** How the CLI words a refused ask; a headless refusal repeats the ask's reason instead. */
const REFUSED =
	/^(?:Permission (?:to use|for this)|The user doesn't want to proceed with this tool use)/u;

/** A write that ran: a denied or failed one wrote nothing. */
export const didWrite = (answer: {
	readonly deny?: string | undefined;
	readonly isError?: unknown;
}): boolean => answer.deny === undefined && answer.isError === undefined;

/** What the hooks before Stop record for it. */
export interface Turn {
	wrote: boolean;
	// A headless session has no person to answer, so no ask can reach anyone.
	interactive: boolean;
	readonly denied: Set<string>;
}

/** What the guards and the Stop hook share: the turn record and the reasons of the asks not yet answered. */
export interface StopState {
	readonly turn: Turn;
	readonly asked: Map<string, string>;
}

/** A fresh `StopState`. */
export const stopState = (): StopState => ({
	turn: { wrote: false, interactive: true, denied: new Set() },
	asked: new Map(),
});

/** Records the id of a call a check denied, and the reason of one it asked about; a denied call reaches `tool.call` as an error, the same as one that ran and failed, and only `tool.check` tells them apart. */
export function stopCheck(
	e: CheckEvent,
	next: CheckNext,
	state: StopState,
): CheckAnswer {
	return next(e).then((verdict) => {
		if (e.tool_use_id !== undefined && verdict.decision === "deny") {
			state.turn.denied.add(e.tool_use_id);
		}
		if (e.tool_use_id !== undefined && verdict.decision === "ask") {
			state.asked.set(e.tool_use_id, verdict.reason ?? "");
		}
		return verdict;
	});
}

/** Records whether a write ran, and the id of a call a refusal ended. */
export function stopCall(
	e: CallEvent,
	next: CallNext,
	state: StopState,
): CallAnswer {
	return next(e).then((answer) => {
		if (isWriter(e.tool)) {
			state.turn.wrote ||= didWrite(answer);
		}
		const reason = state.asked.get(e.tool_use_id);
		const text = answer.text ?? "";
		if (
			answer.isError &&
			reason !== undefined &&
			(text === reason || REFUSED.test(text))
		) {
			state.turn.denied.add(e.tool_use_id);
		}
		return answer;
	});
}
