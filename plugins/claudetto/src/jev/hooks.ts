// The two hooks of the decision tool, and the one place where it meets `$`. The rest of `jev/` stays
// pure, so a test calls it with plain values.
//
// `session.start` declares `mcp__claudetto__decide`, and `tool.call` serves it (`design.md`, "Auto
// Mode"). Nothing here touches `AskUserQuestion`: that dialog is the user's own decision, so it
// reaches the user whatever the option (`specs/low-hitl/spec.md`, "The Dialog Reaches the User").
//
// Both hooks live in this one file with the key they read, and `register.ts` registers them by
// reference: the engine's loader follows `$` into another file only through a `function`
// declaration, which the lint rules forbid.

import type { EngineInterface, HookFor, MatchedHook } from "claude-code";
import { jevBody, postJev } from "./api.ts";
import { questionsOfInput } from "./ask.ts";
import { judgeQuestions, replyOf } from "./judge.ts";
import { jevKey, keptOptions } from "./options.ts";
import {
	DECIDE_CALL,
	DECIDE_INPUT_SCHEMA,
	DECIDE_TOOL,
	TOOL_DECIDE,
} from "./prompts.ts";

/** The key of Jev, or none when the option is not `jev` or no key is set. The env name is a literal, so the host can follow it. */
const keyFor = ($: EngineInterface): Promise<string | undefined> =>
	jevKey(keptOptions(), () => $.env.get("TYPESAFE_API_KEY"));

/** Declares the tool, when Jev can answer. A session with no key gets no tool, so the model never sees a tool it cannot call. */
const declare = async ($: EngineInterface): Promise<void> => {
	if (await keyFor($)) {
		await $.tool.register({
			name: DECIDE_TOOL,
			description: TOOL_DECIDE,
			inputSchema: DECIDE_INPUT_SCHEMA,
		});
	}
};

/**
 * `session.start`: declares the decision tool. `$.tool.register` rejects until the session binds, so
 * a refusal before `next` is tried again after it. The event fires once per process and never on
 * `/clear`, so one declaration covers the session.
 */
export const onSessionStart: HookFor<"session.start"> = async ($, e, next) => {
	let early = true;
	try {
		await declare($);
	} catch {
		early = false;
	}
	const started = await next(e);
	if (!early) {
		await declare($).catch(() => undefined);
	}
	return started;
};

/**
 * The matcher of the hook below, exported so `register.ts` registers it with the same value the type
 * is built from: a matcher on the one tool keeps every other call out of the hook, `AskUserQuestion`
 * among them, so that dialog reaches the user.
 */
export const DECIDE_MATCH = { tool: [DECIDE_CALL] } as const;

/**
 * Serves the registered decision tool: it sends the questions to Jev in one request and gives back
 * each pick with its confidence. A question Jev is unsure about gets no pick, and the reply says so,
 * so the model takes the decision back rather than reading silence as a pick.
 */
export const onDecide: MatchedHook<"tool.call", typeof DECIDE_MATCH> = async (
	$,
	e,
	next,
) => {
	const key = await keyFor($);
	const questions = questionsOfInput(e);
	if (!key || questions === undefined) {
		return next(e);
	}
	const picks = await judgeQuestions(questions, (request) =>
		postJev(key, jevBody(request.state, request.questions), {
			fetch: (url, init) => $.http.fetch(url, init),
			sleep: (ms, options) => $.clock.sleep(ms, options),
		}),
	);
	return { result: replyOf(questions, picks) };
};
