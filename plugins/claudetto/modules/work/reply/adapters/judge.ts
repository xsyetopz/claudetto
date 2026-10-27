// The judge of the opening of a reply: Jev first, then `OPENING_MODEL` when Jev is not sure. A fault of either step is no verdict.
// `mod.ts` gives each read as a closure over `$`, because the mod runtime follows `$` into no imported arrow function.

import type { EngineInterface } from "claude-code";
import { pluginOptions } from "../../../../kernel/options.ts";
import { answerOf } from "../../../gate/domain/classifier.ts";
import { jevBody, noulOf, postJev } from "../../../jev/domain/jev.ts";
import { jevKey } from "../../../jev/domain/request.ts";
import {
	OPENING_MAX_TOKENS,
	OPENING_MODEL,
	OPENING_NO_MAX,
	OPENING_TIMEOUT_MS,
	OPENING_YES_MIN,
} from "../limits.ts";
import {
	JEV_QUESTION,
	JEV_STATE,
	OPENING_PROMPT,
	OPENING_SYSTEM,
} from "../prompts.ts";

/** The reads and calls of the judge. `jevKey` reads the env var `TYPESAFE_API_KEY`. */
export interface JudgeIo {
	readonly jevKey: () => Promise<string | undefined>;
	readonly fetch: EngineInterface["http"]["fetch"];
	readonly sleep: EngineInterface["clock"]["sleep"];
	readonly complete: EngineInterface["model"]["complete"];
}

/** What the judge reads. */
export interface Facts {
	readonly request: string;
	readonly opening: string;
}

/** P(yes) of Jev, or `undefined` with no key, on a fault, or on a bad answer. */
const askJev = async (
	io: JudgeIo,
	facts: Facts,
): Promise<number | undefined> => {
	const key = await jevKey(pluginOptions(), io.jevKey);
	if (!key) {
		return undefined;
	}
	const answers = await postJev(
		key,
		jevBody(JEV_STATE(facts), {
			q: { type: "noul", instructions: JEV_QUESTION },
		}),
		{ fetch: io.fetch },
		{ sleep: io.sleep },
	).catch(() => undefined);
	return noulOf(answers, "q");
};

/** True when the model blocks, false when it allows, `undefined` on a fault or an answer with no single `<block>` tag. */
const askModel = async (
	io: JudgeIo,
	facts: Facts,
): Promise<boolean | undefined> => {
	const reply = await io
		.complete({
			model: OPENING_MODEL,
			system: OPENING_SYSTEM,
			prompt: OPENING_PROMPT(facts),
			effort: "low",
			maxTokens: OPENING_MAX_TOKENS,
			timeoutMs: OPENING_TIMEOUT_MS,
		})
		.catch(() => undefined);
	return reply?.isAnswered ? answerOf(reply.text)?.block : undefined;
};

/** True when the opening is filler. Jev decides at either end, else the model does, unless `isModelOn` is false. A fault gives `false`, so the stop goes on. */
export const isFiller = async (
	io: JudgeIo,
	facts: Facts,
	isModelOn: boolean,
): Promise<boolean> => {
	try {
		const p = await askJev(io, facts);
		if (p !== undefined && p >= OPENING_YES_MIN) {
			return true;
		}
		if (p !== undefined && p <= OPENING_NO_MAX) {
			return false;
		}
		return isModelOn ? ((await askModel(io, facts)) ?? false) : false;
	} catch {
		return false;
	}
};
