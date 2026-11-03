import type { HookBudget, HookFor, TurnUsage } from "claude-code";
import { atRoot } from "../handoff/root.ts";
import { heartbeatPath } from "../heartbeat/path.ts";
import { boundable, boundOf } from "./bound.ts";
import { WITHHELD } from "./prompts.ts";
import { newStep, type Step, takeStep, waitFor } from "./steps.ts";

const BUDGET_MS: HookBudget["ms"] = 10_000;

/** Time left for the rest of the hook once the wait on the stop chunk ends. */
const SPARE_MS = 1000;

/** The engine runs a tool while its step still streams, so a call can finish before the stop chunk; each call of a step that can be bounded waits on its own step's chunk. It also writes the heartbeat, since the hook loader takes one `turn.step` hook without a matcher. */
export const onStep: HookFor<"turn.step"> = async function* ($, e, next) {
	const beat = async (): Promise<void> => {
		try {
			const [session, root, now] = await Promise.all([
				$.session.id(),
				$.session.root(),
				$.clock.now(),
			]);
			await $.fs.write(atRoot(root, heartbeatPath(session)), String(now));
		} catch {
			// The request goes on; the status line reads a missing or old heartbeat as hooks that stopped.
		}
	};
	const step = boundable(e.model) ? newStep() : undefined;
	await beat();
	const stream = next(e);
	try {
		for await (const chunk of stream) {
			switch (chunk.kind) {
				case "tool":
					if (step !== undefined) {
						waitFor(chunk.id, step);
					}
					break;
				case "stop":
					step?.settle(chunk.usage);
					await beat();
					break;
				default:
					break;
			}
			yield chunk;
		}
		return await stream.result;
	} finally {
		step?.settle(null);
	}
};

// Core sets `text`; a result a hook answered beneath carries only `result`, which the model reads as its text or its JSON.
const modelText = (result: unknown, text: string | undefined): string =>
	text ?? (typeof result === "string" ? result : JSON.stringify(result));

type CallArgs = Parameters<HookFor<"tool.call">>;

/** The step's reading, or none once the hook's budget nears its end or its signal aborts: the wait is the hook's own time, and a step can stream long after its calls. */
const readingWithin = async (
	$: CallArgs[0],
	step: Step,
	next: CallArgs[2],
): Promise<TurnUsage | null> => {
	const done = new AbortController();
	const ms = Math.min(next.budget.remainingMs, BUDGET_MS) - SPARE_MS;
	const late = async (): Promise<null> => {
		try {
			await $.clock.sleep(Math.max(0, ms), {
				signal: AbortSignal.any([next.signal, done.signal]),
			});
		} catch {
			// An aborted wait ends the same way as one that ran out.
		}
		return null;
	};
	try {
		return await Promise.race([step.reading, late()]);
	} finally {
		done.abort();
	}
};

/** A result counts with its `context`, since both land in the next request. */
export const onToolCall: HookFor<"tool.call"> = async ($, e, next) => {
	const step = takeStep(e.tool_use_id);
	const answer = await next(e);
	if (step === undefined || answer.deny !== undefined) {
		return answer;
	}
	const chars =
		modelText(answer.result, answer.text).length +
		(answer.context?.join("").length ?? 0);
	const bound = boundOf(await readingWithin($, step, next), step.passed, chars);
	if (bound.withhold) {
		return { deny: WITHHELD(bound) };
	}
	step.passed += bound.tokens;
	return answer;
};
