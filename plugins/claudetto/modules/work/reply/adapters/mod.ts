// The mod handler of the `reply` slice: `Stop` blocks one time a reply that opens with agreement, praise, an apology, or self-blame.
// The text of the reply is `last_assistant_message` of `StopHookInput` (`extend/mod-api/types/classic.md` of the 2.1.311 docs, line 514: "Text content of the last assistant message before stopping").
// A model judges the opening with no word list, so the rule works in any language. No model runs when the reply has no text.

import type { EngineInterface } from "claude-code";
import type { Handler } from "../../../../kernel/hooks.ts";
import { pluginOptions } from "../../../../kernel/options.ts";
import { isClassifierOn } from "../../../gate/adapters/classifier.ts";
import { lastRequest, openingOf } from "../domain/opening.ts";
import { REPEAT } from "../prompts.ts";
import { isFiller, type JudgeIo } from "./judge.ts";

const judgeIo = ($: EngineInterface): JudgeIo => ({
	complete: (request) => $.model.complete(request),
	sleep: (wait, abort) => $.clock.sleep(wait, abort),
	fetch: (to, body) => $.http.fetch(to, body),
	jevKey: () => $.env.get("TYPESAFE_API_KEY"),
});

const requestOf = async ($: EngineInterface): Promise<string> => {
	try {
		const found = await $.session.messages();
		return Array.isArray(found) ? lastRequest(found) : "";
	} catch {
		return "";
	}
};

/** `classic.Stop` with `stop_hook_active` false: blocks the stop one time when the judge finds filler in the opening of the reply. */
export const onStop: Handler<"classic.Stop"> = async ($, e, next) => {
	const opening = openingOf(e.last_assistant_message ?? "");
	if (e.agent_id !== undefined || opening === "") {
		return next(e);
	}
	const facts = { opening, request: await requestOf($) };
	if (await isFiller(judgeIo($), facts, isClassifierOn(pluginOptions()))) {
		return { ...(await next(e)), block: REPEAT() };
	}
	return next(e);
};
