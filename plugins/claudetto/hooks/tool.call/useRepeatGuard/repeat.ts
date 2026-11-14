import type { On } from "claude-code";

import type { CallAnswer, CallEvent, CallNext } from "../../chain";
import { fieldOf } from "../../shell/verdict";
import { repeatWithheld } from "../../texts-gate";

// A short text, such as `(no output)`, is cheaper to send again than to point at, so only one this long is checked as a part of a longer one.
const PART_MIN = 80;
const REMINDER = /<system-reminder>[\s\S]*?<\/system-reminder>/gu;
// `Read` numbers each line, which `cat` or `sed -n` of the same lines does not.
const LINE_NUMBER = /^\s*\d+(?:\t|→)/gmu;
// A rerun of the same check prints new timings, which are no new fact.
const DURATION = /\b\d+(?:\.\d+)?\s?(?:ns|µs|us|ms|s|m)\b/gu;

interface Held {
	readonly id: string;
	readonly text: string;
}

interface Loop {
	held: Held[];
	misses: number;
}

/** Per loop (`agentId`, or `""` for the main conversation): the read-only results it holds, and how many calls in a row brought nothing new. */
export type RepeatState = Map<string, Loop>;

export const repeatState = (): RepeatState => new Map();

const normal = (text: string): string =>
	text
		.replaceAll(REMINDER, "")
		.replaceAll(LINE_NUMBER, "")
		.replaceAll(DURATION, "#")
		.split("\n")
		.map((line) => line.trimEnd())
		.join("\n")
		.trim();

const holder = (
	held: readonly Held[],
	text: string,
	part: boolean,
): Held | undefined =>
	held.find(
		(h) =>
			h.text === text ||
			(part && text.length >= PART_MIN && h.text.includes(text)),
	);

const loopOf = (state: RepeatState, e: CallEvent): Loop => {
	const key = e.agentId ?? "";
	const loop = state.get(key) ?? { held: [], misses: 0 };
	state.set(key, loop);
	return loop;
};

// The agent wrote this text itself, so a later read of it brings nothing new; a change is progress, so it also ends a run of misses.
function learnWrite(e: CallEvent, loop: Loop): void {
	const id = e.tool_use_id ?? "";
	const content = fieldOf(e, "content");
	if (e.tool === "Write" && content !== undefined) {
		loop.held.push({ id, text: normal(content) });
		loop.misses = 0;
		return;
	}
	const before = normal(fieldOf(e, "old_string") ?? "");
	const after = normal(fieldOf(e, "new_string") ?? "");
	if (e.tool !== "Edit" || before === "") {
		return;
	}
	loop.misses = 0;
	const all = Object.entries(e).some(
		([k, v]) => k === "replace_all" && v === true,
	);
	loop.held = loop.held.map((h) =>
		h.text.includes(before)
			? {
					id,
					text: all
						? h.text.replaceAll(before, after)
						: h.text.replace(before, after),
				}
			: h,
	);
}

/**
 * Withholds a read-only result whose text the loop already holds, whole or as a part, and a `Bash` output it holds whole, whatever the call's
 * input was, and points at the call that gave it. A `Write` or `Edit` updates what the loop holds, so a read back of the agent's own change is
 * withheld too, and a change made another way reads differently and passes. `Edit` and `Write` answer the same text for every change, so their
 * own results are never withheld.
 */
export async function repeatCall(
	e: CallEvent,
	next: CallNext,
	state: RepeatState,
): Promise<Awaited<CallAnswer>> {
	const answer = await next(e);
	if (answer.deny !== undefined || answer.isError === true) {
		return answer;
	}
	learnWrite(e, loopOf(state, e));
	if (
		(answer.isReadOnly !== true && e.tool !== "Bash") ||
		answer.text === undefined
	) {
		return answer;
	}
	const text = normal(answer.text);
	if (text === "") {
		return answer;
	}
	const loop = loopOf(state, e);
	const earlier = holder(loop.held, text, answer.isReadOnly === true);
	if (earlier === undefined) {
		loop.held.push({ id: e.tool_use_id ?? "", text });
		loop.misses = 0;
		return answer;
	}
	loop.misses += 1;
	return { deny: repeatWithheld(earlier.id, loop.misses) };
}

/** Forgets what a loop holds once it no longer holds it: after its compaction, and for every loop after a `/clear`, where the process goes on. */
export const repeatHooks = (on: On, state: RepeatState): void => {
	on(
		"session.compact",
		{ trigger: ["manual", "auto", "plugin"] },
		async (_$, e, next) => {
			const answer = await next(e);
			if (answer.skip === undefined) {
				state.delete(e.agentId ?? "");
			}
			return answer;
		},
	);
	on("session.end", { reason: "clear" }, (_$, e, next) => {
		state.clear();
		return next(e);
	});
};
