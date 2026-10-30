import type {
	EngineInterface,
	HookFor,
	MatchedHook,
	On,
	PluginOptions,
} from "claude-code";
import type { Block, BlockContext, WithOptions } from "../block.ts";
import { jevBody, postJev } from "./api.ts";
import { questionsOfInput } from "./ask.ts";
import { judgeQuestions, replyOf } from "./judge.ts";
import { jevKey } from "./options.ts";
import {
	DECIDE_CALL,
	DECIDE_INPUT_SCHEMA,
	DECIDE_TOOL,
	TOOL_DECIDE,
} from "./prompts.ts";

/** The env name is a literal, so the host can follow it. */
const keyFor = (
	$: EngineInterface,
	options: PluginOptions,
): Promise<string | undefined> =>
	jevKey(options, () => $.env.get("TYPESAFE_API_KEY"));

/** A session with no key gets no tool, so the model never sees a tool it cannot call. */
const declare = async (
	$: EngineInterface,
	options: PluginOptions,
): Promise<void> => {
	if (await keyFor($, options)) {
		await $.tool.register({
			name: DECIDE_TOOL,
			description: TOOL_DECIDE,
			inputSchema: DECIDE_INPUT_SCHEMA,
		});
	}
};

/** `$.tool.register` rejects until the session binds, so a refusal before `next` is retried after. */
export const onSessionStart: WithOptions<HookFor<"session.start">> = async (
	$,
	e,
	next,
	options,
) => {
	let early = true;
	try {
		await declare($, options);
	} catch {
		early = false;
	}
	const started = await next(e);
	if (!early) {
		await declare($, options).catch(() => undefined);
	}
	return started;
};

/** A matcher on the one tool keeps `AskUserQuestion` out of the hook, so that dialog reaches the user. */
export const DECIDE_MATCH = { tool: [DECIDE_CALL] } as const;

/** A question Jev is unsure about gets no pick and the reply says so, so the model takes it back. */
export const onDecide: WithOptions<
	MatchedHook<"tool.call", typeof DECIDE_MATCH>
> = async ($, e, next, options) => {
	const key = await keyFor($, options);
	const questions = questionsOfInput(e);
	if (!key || questions === undefined) {
		return next(e);
	}
	const picks = await judgeQuestions(questions, (request) =>
		postJev(key, jevBody(request.state, request.questions), {
			fetch: (url, init) => $.http.fetch(url, init),
			sleep: (ms, wait) => $.clock.sleep(ms, wait),
		}),
	);
	return { result: replyOf(questions, picks) };
};

export const decide: Block = {
	id: "decide",
	kind: "policy",
	routes: ["session.start", "tool.call"],
	needs: "2.1.314",
};

export const attachDecide = (on: On, context: BlockContext): void => {
	on("session.start", ($, e, next) =>
		onSessionStart($, e, next, context.options),
	);
	on("tool.call", DECIDE_MATCH, ($, e, next) =>
		onDecide($, e, next, context.options),
	);
};
