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
	/** A command's output, which a change can make stale, unlike a file's text, which `learnWrite` keeps current. */
	readonly isOutput?: true;
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

/** A `Bash` run with no output: what the agent reads is the same notice for every such run, which tells it nothing it already held. */
const isSilent = (answer: Awaited<CallAnswer>): boolean => {
	const result: unknown = answer.result;
	return (
		typeof result === "object" &&
		result !== null &&
		"stdout" in result &&
		"stderr" in result &&
		String(result.stdout).trim() === "" &&
		String(result.stderr).trim() === ""
	);
};

const holder = (held: readonly Held[], text: string): Held | undefined =>
	held.find(
		(h) =>
			h.text === text || (text.length >= PART_MIN && h.text.includes(text)),
	);

const loopOf = (state: RepeatState, e: CallEvent): Loop => {
	const key = e.agentId ?? "";
	const loop = state.get(key) ?? { held: [], misses: 0 };
	state.set(key, loop);
	return loop;
};

// A change is progress, so it ends a run of misses, and a check run after it brings a new fact even when it prints what it printed before.
function learnChange(loop: Loop): void {
	loop.misses = 0;
	loop.held = loop.held.filter((h) => h.isOutput !== true);
}

// The agent wrote this text itself, so a later read of it brings nothing new.
function learnWrite(e: CallEvent, loop: Loop): void {
	const id = e.tool_use_id ?? "";
	const content = fieldOf(e, "content");
	if (e.tool === "Write" && content !== undefined) {
		learnChange(loop);
		loop.held.push({ id, text: normal(content) });
		return;
	}
	const before = normal(fieldOf(e, "old_string") ?? "");
	const after = normal(fieldOf(e, "new_string") ?? "");
	if (e.tool !== "Edit" || before === "") {
		return;
	}
	learnChange(loop);
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
 * Withholds a read-only result or a `Bash` output whose text the loop already holds, whole or as a part, whatever the call's input was, so a
 * rerun cut with `tail` or `grep` is withheld too, and points at the call that gave it. A change, as an `Edit`, a `Write`, or a `Bash` run that
 * is not read-only and prints nothing, forgets the held command outputs, so a check rerun after it passes. A `Write` or `Edit` updates what the loop holds, so a read back of the agent's own change is
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
	const loop = loopOf(state, e);
	const isOutput = answer.isReadOnly !== true;
	// A command that writes prints nothing, as `sed -i` or `git commit -q` do.
	if (isOutput && isSilent(answer)) {
		learnChange(loop);
		return answer;
	}
	const text = normal(answer.text);
	if (text === "" || isSilent(answer)) {
		return answer;
	}
	const earlier = holder(loop.held, text);
	if (earlier === undefined) {
		loop.held.push({
			id: e.tool_use_id ?? "",
			text,
			...(isOutput ? { isOutput } : {}),
		});
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
