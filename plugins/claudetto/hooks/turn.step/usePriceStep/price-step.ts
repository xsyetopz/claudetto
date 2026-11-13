import type {
	EngineInterface,
	On,
	TurnStepChunk,
	TurnUsage,
} from "claude-code";

import type { CallAnswer, CallEvent, CallNext } from "../../chain";
import {
	atRoot,
	heartbeatPath,
} from "../../session.measure/useLineFile/heartbeat";
import { WITHHELD } from "../../texts";
import { deferred, withinBudget } from "../../tools";

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

/** One request's reading, which its stop chunk settles, and the tokens of its results that went through. */
interface Step {
	readonly reading: Promise<TurnUsage | null>;
	readonly settle: (usage: TurnUsage | null) => void;
	passed: number;
}

const newStep = (): Step => {
	const { promise, resolve } = deferred<TurnUsage | null>();
	return { reading: promise, settle: resolve, passed: 0 };
};

// Core sets `text`; a result a hook answered beneath carries only `result`, which the model reads as its text or its JSON.
const modelText = (result: unknown, text: string | undefined): string =>
	text ?? (typeof result === "string" ? result : JSON.stringify(result));

const beatOf = ($: EngineInterface) => async (): Promise<void> => {
	try {
		const [session, root, now] = await Promise.all([
			$.session.id(),
			$.session.root(),
			$.clock.now(),
		]);
		await $.fs.write(atRoot(root, heartbeatPath(session)), String(now));
	} catch (error) {
		// The status line reads a missing or old heartbeat as hooks that stopped.
		$.ui.log(`The heartbeat was not written (${String(error)})`);
	}
};

const stepHook = (on: On, byCall: Map<string, Step>): void => {
	on("turn.step", async function* ($, e, next) {
		const beat = beatOf($);
		const step = boundable(e.model) ? newStep() : undefined;
		const note = async (chunk: TurnStepChunk): Promise<void> => {
			if (chunk.kind === "tool" && step !== undefined) {
				byCall.set(chunk.id, step);
			} else if (chunk.kind === "stop") {
				step?.settle(chunk.usage);
				await beat();
			}
		};
		await beat();
		const stream = next(e);
		try {
			for await (const chunk of stream) {
				await note(chunk);
				yield chunk;
			}
			return await stream.result;
		} finally {
			step?.settle(null);
		}
	});
};

/** The steps of the calls in flight, keyed by `tool_use_id`, which names one call in one step on any loop. */
export type PriceStepState = Map<string, Step>;

/** Makes the map a step's calls and its `turn.step` hook share. */
export const priceStepState = (): PriceStepState => new Map<string, Step>();

/** Withholds a result of a bounded step that would cross the price step. */
export async function priceStepCall(
	$: EngineInterface,
	e: CallEvent,
	next: CallNext,
	state: PriceStepState,
): Promise<Awaited<CallAnswer>> {
	const step = state.get(e.tool_use_id);
	state.delete(e.tool_use_id);
	const answer = await next(e);
	if (step === undefined || answer.deny !== undefined) {
		return answer;
	}
	// A step can stream long after its calls, so the stop chunk may not come within the budget.
	const usage = await withinBudget(
		$,
		step.reading,
		next.budget.remainingMs,
		next.signal,
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
}

/**
 * The engine runs a tool while its step still streams, so a call can finish before the stop chunk: each call of a
 * bounded step waits on its own step. `turn.step` also writes the heartbeat, since the loader takes one
 * `turn.step` hook without a matcher.
 */
export const priceStepHooks = (on: On, byCall: PriceStepState): void => {
	stepHook(on, byCall);
};
