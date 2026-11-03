import type {
	EngineInterface,
	ModelCompleteRequest,
	ModelCompleteResult,
	On,
	PluginOptions,
	PreToolUseResult,
	ToolCallEnvelope,
} from "claude-code";
import { optionOverDefault } from "../../shared/option.ts";
import { PERSON_PROMPT } from "../../shared/person.ts";
import type { Block, BlockContext } from "../block.ts";
import { jevBody, postJev } from "../decide/api.ts";
import { keyOf } from "../decide/options.ts";
import {
	CLASSIFY_KEY,
	classifyOf,
	classifyRowOf,
	keepClassify,
} from "../window/classify-spend.ts";
import { hookSplitsOf, needsBlocks } from "./hook-feedback.ts";
import { markJudged } from "./judged.ts";
import { onMidTurnPrompt } from "./mid-turn.ts";
import { transcriptOf } from "./transcript.ts";
import {
	actionOf,
	denied,
	frameFault,
	jevQuestion,
	jevVerdict,
	READ_ONLY_TOOLS,
	secondLook,
	type Variant,
	type VerdictRequest,
	verdictOf,
	verdictRequest,
} from "./verdict.ts";

const promptsRef = { plugin: "claudetto", key: "prompts" } as const;

export const variantOf = (options: PluginOptions): Variant | undefined => {
	const value = optionOverDefault(
		options,
		"classifierModel",
		"classifier",
		"off",
	);
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

const complete = async (
	$: EngineInterface,
	request: ModelCompleteRequest,
): Promise<ModelCompleteResult> => {
	const reply = await $.model.complete(request);
	// A failed write must not change the verdict, so it is logged and dropped.
	try {
		const made = classifyRowOf(request.model, reply, await $.clock.now());
		const rows = classifyOf(await $.store.get(CLASSIFY_KEY));
		await $.store.set(CLASSIFY_KEY, keepClassify(rows, made));
	} catch (error) {
		$.ui.log(`Failed to record the classify tokens (${error})`);
	}
	return reply;
};

/** A reply that breaks the frame gets one more ask; a second break still denies, and says why. */
const judge = async (
	$: EngineInterface,
	request: VerdictRequest,
): Promise<PreToolUseResult> => {
	const reply = await complete($, request);
	const fault = frameFault(reply);
	if (fault === undefined || !reply.isAnswered) {
		return verdictOf(reply);
	}
	const again = await complete($, secondLook(request, reply.text, fault));
	const verdict = verdictOf(again);
	const still = frameFault(again);
	return still !== undefined && "deny" in verdict
		? { deny: `${verdict.deny} The model broke the frame twice: ${still}.` }
		: verdict;
};

/** A thrown hook is skipped and the hooks beneath decide, so every failure answers deny here. */
export const classify = async (
	$: EngineInterface,
	e: ToolCallEnvelope,
	variant: Variant,
	options: PluginOptions,
): Promise<PreToolUseResult> => {
	try {
		const messages = await $.session.messages();
		const api = needsBlocks(messages)
			? await $.session.messages({ as: "api" })
			: [];
		const transcript = transcriptOf(
			messages,
			(await $.state.get(promptsRef).catch(() => undefined))?.value,
			hookSplitsOf(Array.isArray(api) ? api : []),
		);
		const action = actionOf(e);
		const jev = await askJev($, options, transcript, action);
		if (jev !== undefined) {
			return jev;
		}
		return await judge($, verdictRequest(variant, transcript, action));
	} catch (error) {
		return denied(`the check failed (${error})`);
	}
};

export const classifyBlock: Block = {
	id: "classify",
	kind: "policy",
	routes: ["classic.PreToolUse", "prompt.submit"],
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
	on("prompt.submit", PERSON_PROMPT, onMidTurnPrompt);
};
