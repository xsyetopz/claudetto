import type { HookBudget, On, TurnUsage } from "claude-code";

import { atRoot } from "../handoff/layout.ts";
import { WITHHELD } from "../texts.ts";
import { heartbeatPath } from "./heartbeat.ts";

const HAIKU_MODEL = "claude-haiku-5-5";

/** Above this many tokens Haiku 5.5 bills the whole request at five times. */
const HAIKU_PRICE_STEP = 100_000;

// The Haiku 5.5 page of the platform docs says the same text counts as about 30 percent more tokens than on Haiku 4.5, so 3 errs toward withholding where 4 would let a result cross.
const CHARS_PER_TOKEN = 3;

const tokensOf = (chars: number): number => Math.ceil(chars / CHARS_PER_TOKEN);

type Bound =
	| { readonly withhold: false; readonly tokens: number }
	| {
			readonly withhold: true;
			readonly tokens: number;
			readonly total: number;
	  };

/** Whether a step can be bounded, from the model the request names, which may be the `haiku` alias. */
const boundable = (model: string): boolean =>
	model === "haiku" || model.startsWith(HAIKU_MODEL);

/** Bounds a result of `chars` against the step that made the call, after the `passed` tokens of that step's results that went through. */
const boundOf = (
	usage: TurnUsage | null,
	passed: number,
	chars: number,
): Bound => {
	const tokens = tokensOf(chars);
	if (usage === null || !usage.model.startsWith(HAIKU_MODEL)) {
		return { withhold: false, tokens };
	}
	const total =
		usage.input_tokens +
		usage.cache_read_input_tokens +
		usage.cache_creation_input_tokens +
		usage.output_tokens +
		passed +
		tokens;
	return total > HAIKU_PRICE_STEP
		? { withhold: true, tokens, total }
		: { withhold: false, tokens };
};

const BUDGET_MS: HookBudget["ms"] = 10_000;

/** Time left for the rest of the hook once the wait on the stop chunk ends. */
const SPARE_MS = 1000;

/** One request's reading, which its stop chunk settles, and the tokens of its results that went through. */
interface Step {
	readonly reading: Promise<TurnUsage | null>;
	readonly settle: (usage: TurnUsage | null) => void;
	passed: number;
}

const newStep = (): Step => {
	const { promise, resolve } = Promise.withResolvers<TurnUsage | null>();
	return { reading: promise, settle: resolve, passed: 0 };
};

// Core sets `text`; a result a hook answered beneath carries only `result`, which the model reads as its text or its JSON.
const modelText = (result: unknown, text: string | undefined): string =>
	text ?? (typeof result === "string" ? result : JSON.stringify(result));

/**
 * The engine runs a tool while its step still streams, so a call can finish before the stop chunk: each call of a
 * bounded step waits on its own step. `turn.step` also writes the heartbeat, since the loader takes one
 * `turn.step` hook without a matcher.
 */
export const priceStepHooks = (on: On): void => {
	// Keyed by `tool_use_id`, which names one call in one step on any loop.
	const byCall = new Map<string, Step>();
	on("turn.step", async function* ($, e, next) {
		const beat = async (): Promise<void> => {
			try {
				const [session, root, now] = await Promise.all([
					$.session.id(),
					$.session.root(),
					$.clock.now(),
				]);
				await $.fs.write(atRoot(root, heartbeatPath(session)), String(now));
			} catch {
				// The status line reads a missing or old heartbeat as hooks that stopped.
			}
		};
		const step = boundable(e.model) ? newStep() : undefined;
		await beat();
		const stream = next(e);
		try {
			for await (const chunk of stream) {
				if (chunk.kind === "tool" && step !== undefined) {
					byCall.set(chunk.id, step);
				} else if (chunk.kind === "stop") {
					step?.settle(chunk.usage);
					await beat();
				}
				yield chunk;
			}
			return await stream.result;
		} finally {
			step?.settle(null);
		}
	});
	on("tool.call", async ($, e, next) => {
		const step =
			e.tool_use_id === undefined ? undefined : byCall.get(e.tool_use_id);
		byCall.delete(e.tool_use_id ?? "");
		const answer = await next(e);
		if (step === undefined || answer.deny !== undefined) {
			return answer;
		}
		// The wait is the hook's own time, and a step can stream long after its calls.
		const done = new AbortController();
		const late = async (): Promise<null> => {
			try {
				await $.clock.sleep(
					Math.max(0, Math.min(next.budget.remainingMs, BUDGET_MS) - SPARE_MS),
					{ signal: AbortSignal.any([next.signal, done.signal]) },
				);
			} catch {
				// An aborted wait ends the same way as one that ran out.
			}
			return null;
		};
		const usage = await Promise.race([step.reading, late()]).finally(() =>{ 
			done.abort(); },
		);
		// A result counts with its `context`, since both land in the next request.
		const chars =
			modelText(answer.result, answer.text).length +
			(answer.context?.join("").length ?? 0);
		const bound = boundOf(usage, step.passed, chars);
		if (bound.withhold) {
			return { deny: WITHHELD(bound) };
		}
		step.passed += bound.tokens;
		return answer;
	});
};
