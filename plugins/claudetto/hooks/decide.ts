import type { EngineInterface, PluginOptions } from "claude-code";

import type { CallAnswer, CallEvent, CallNext } from "./chain.ts";
import { postJev } from "./decide/jev.ts";
import {
	questionsOfInput,
	replyOf,
	requestOf,
	verdictsOf,
} from "./decide/judge.ts";
import { stringOption } from "./options.ts";
import { DECIDE_CALL } from "./texts-gate.ts";

/** Answers a `decide` call through Jev; every other tool, and `AskUserQuestion`, passes on. */
export async function decideCall(
	$: EngineInterface,
	e: CallEvent,
	next: CallNext,
	options: PluginOptions,
): Promise<Awaited<CallAnswer>> {
	if (![DECIDE_CALL].includes(e.tool)) {
		return next(e);
	}
	const key = stringOption(options, "typesafeApiKey");
	const questions = questionsOfInput(e);
	if (!key || questions === undefined) {
		return next(e);
	}
	const request = requestOf(questions);
	if (request === undefined) {
		return { result: replyOf(questions, "no question can be asked.") };
	}
	try {
		const answers = await postJev(key, request, {
			fetch: (url, init) => $.http.fetch(url, init),
			sleep: (ms, wait) => $.clock.sleep(ms, wait),
		});
		return { result: replyOf(questions, verdictsOf(questions, answers)) };
	} catch (error) {
		const why = error instanceof Error ? error.message : "the request failed.";
		return { result: replyOf(questions, why) };
	}
}
