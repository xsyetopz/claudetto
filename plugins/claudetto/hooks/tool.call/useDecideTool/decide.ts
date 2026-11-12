import type { EngineInterface } from "claude-code";

import type { CallAnswer, CallEvent, CallNext } from "../../chain.ts";
import { postJev } from "../../decider/jev.ts";
import { DECIDE_CALL } from "../../texts-gate.ts";
import { questionsOfInput, replyOf, requestOf, verdictsOf } from "./judge.ts";

/** The key of TypeSafe, or an empty string when the environment holds none. */
export async function typesafeKey($: EngineInterface): Promise<string> {
	return (await $.env.get("TYPESAFE_API_KEY")) ?? "";
}

/** Answers a `decide` call through Jev; every other tool, and `AskUserQuestion`, passes on. */
export async function decideCall(
	$: EngineInterface,
	e: CallEvent,
	next: CallNext,
): Promise<Awaited<CallAnswer>> {
	if (![DECIDE_CALL].includes(e.tool)) {
		return next(e);
	}
	const key = await typesafeKey($);
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
