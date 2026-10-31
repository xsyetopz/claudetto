import type {
	EngineInterface,
	On,
	PluginOptions,
	PreToolUseResult,
	ToolCallEnvelope,
} from "claude-code";
import type { Block, BlockContext } from "../block.ts";
import { jevBody, postJev } from "../decide/api.ts";
import { keyOf } from "../decide/options.ts";
import { markJudged } from "./judged.ts";
import {
	actionOf,
	denied,
	jevQuestion,
	jevVerdict,
	READ_ONLY_TOOLS,
	transcriptOf,
	type Variant,
	verdictOf,
	verdictRequest,
} from "./verdict.ts";

export const variantOf = (options: PluginOptions): Variant | undefined => {
	const value = options["classifier"];
	return value === "haiku" || value === "sonnet" ? value : undefined;
};

/** A failed Jev call leaves the decision to the model, never to an allow. */
const askJev = async (
	$: EngineInterface,
	options: PluginOptions,
	transcript: string,
	action: string,
): Promise<PreToolUseResult | undefined> => {
	const key = keyOf(options) || (await $.env.get("TYPESAFE_API_KEY"));
	if (!key) {
		return undefined;
	}
	const { state, questions } = jevQuestion(transcript, action);
	try {
		const answers = await postJev(key, jevBody(state, questions), {
			fetch: (url, init) => $.http.fetch(url, init),
			sleep: (ms, wait) => $.clock.sleep(ms, wait),
		});
		return jevVerdict(answers);
	} catch {
		return undefined;
	}
};

/** A thrown hook is skipped and the hooks beneath decide, so every failure answers deny here. */
export const classify = async (
	$: EngineInterface,
	e: ToolCallEnvelope,
	variant: Variant,
	options: PluginOptions,
): Promise<PreToolUseResult> => {
	try {
		const transcript = transcriptOf(await $.session.messages());
		const action = actionOf(e);
		const jev = await askJev($, options, transcript, action);
		if (jev !== undefined) {
			return jev;
		}
		return verdictOf(
			await $.model.complete(verdictRequest(variant, transcript, action)),
		);
	} catch (error) {
		return denied(`the check failed (${error})`);
	}
};

export const classifyBlock: Block = {
	id: "classify",
	kind: "policy",
	routes: ["classic.PreToolUse"],
	needs: "2.1.314",
};

export const attachClassify = (on: On, context: BlockContext): void => {
	on("classic.PreToolUse", async ($, e, next) => {
		const variant = variantOf(context.options);
		if (variant === undefined || READ_ONLY_TOOLS.has(e.tool)) {
			return next(e);
		}
		const result = await classify($, e, variant, context.options);
		if ("allow" in result && result.allow === true) {
			markJudged(e.tool_use_id);
		}
		return result;
	});
};
