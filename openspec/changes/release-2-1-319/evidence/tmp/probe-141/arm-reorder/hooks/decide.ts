import type { On, PluginOptions } from "claude-code";
import { postJev } from "./decide/jev.ts";
import {
	questionsOfInput,
	replyOf,
	requestOf,
	verdictsOf,
} from "./decide/judge.ts";
import { stringOption } from "./options.ts";
import { DECIDE_CALL } from "./texts.ts";

/** The matcher keeps every other tool, and `AskUserQuestion`, away from Jev. */
export const decide = (on: On, options: PluginOptions): void => {
	on("tool.call", { tool: [DECIDE_CALL] }, async ($, e, next) => {
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
			const why =
				error instanceof Error ? error.message : "the request failed.";
			return { result: replyOf(questions, why) };
		}
	});
};
