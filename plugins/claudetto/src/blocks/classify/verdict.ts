// Every path that reaches no verdict denies, because an unwatched session cannot answer a prompt.

import type {
	ModelCompleteRequest,
	ModelCompleteResult,
	ModelEffort,
	PreToolUseResult,
	ToolCallEnvelope,
} from "claude-code";
import { capOf } from "../../shared/thinking.ts";
import { answersOf } from "../decide/ask.ts";
import { classifierRules } from "./prompt.ts";
import { callLine } from "./transcript.ts";

// Claude Code `2.1.317` lists `rejects_disabled_thinking` for `claude-haiku-5-5` in its model catalog, and `[void 0, 2048]` is what it returns for such a model: no `thinking` setting and 2048 tokens of room. The catalog gives `claude-haiku-5-5` and `claude-sonnet-5-5` the `default_effort` `medium`.
export const VARIANTS = {
	haiku: { model: "claude-haiku-5-5", effort: "medium" },
	sonnet: { model: "claude-sonnet-5-5", effort: "medium" },
} as const satisfies Record<
	string,
	{ readonly model: string; readonly effort: ModelEffort }
>;

export type Variant = keyof typeof VARIANTS;

/** Tools that read and change nothing. */
export const READ_ONLY_TOOLS: ReadonlySet<string> = new Set([
	"Read",
	"Glob",
	"Grep",
	"ToolSearch",
	"AskUserQuestion",
	"TodoWrite",
]);

/** A wrong allow costs more than a wrong block, so Jev decides alone only near the ends. */
export const JEV_ALLOW_MAX = 0.05;
export const JEV_BLOCK_MIN = 0.95;

// The cap is a chosen value. Haiku 5.5 gets no `thinking` setting from `$.model.complete` (`2.1.317`), so its thinking runs inside the cap with no budget of its own.
const VERDICT_MAX_TOKENS = 1000;

const VERDICT_CAP = capOf(VERDICT_MAX_TOKENS);

const VERDICT_TIMEOUT_MS = 30_000;

const END_MARK = /[.!?]$/;

const sentence = (text: string): string => {
	const t = text.trim();
	const s = t.charAt(0).toUpperCase() + t.slice(1);
	return END_MARK.test(s) ? s : `${s}.`;
};

/** One flat message: a chain of `a: b: c:` labels hides which part is the reason. */
export const denied = (reason: string, rule?: string): PreToolUseResult => ({
	deny: `The claudetto classifier blocked this call${rule ? ` under the rule ${rule}` : ""}. ${sentence(reason)}`,
});

export const actionOf = (e: ToolCallEnvelope): string => {
	const { tool, tool_use_id: _id, ...args } = e;
	return callLine(tool, args);
};

export const verdictRequest = (
	variant: Variant,
	transcript: string,
	action: string,
): ModelCompleteRequest => ({
	...VARIANTS[variant],
	maxTokens: VERDICT_MAX_TOKENS,
	timeoutMs: VERDICT_TIMEOUT_MS,
	system: [{ text: classifierRules(), cache: true }],
	prompt: `<transcript>\n${transcript}\n</transcript>\n\n<action>\n${action}\n</action>`,
});

const BLOCK = /<block>\s*(yes|no)\s*<\/block>/i;

const REASON = /<reason>([\s\S]*?)<\/reason>/i;

const RULE = /<rule>([\s\S]*?)<\/rule>/i;

type Unanswered = Extract<ModelCompleteResult, { isAnswered: false }>;

// The cause tells a passing outage from a prompt that can never be answered, which a bare "no answer" hides.
const causeOf = (reply: Unanswered): string => {
	switch (reply.reason) {
		case "api-error":
			return reply.status === null
				? `the model call failed with no response (\`${reply.error}\`)`
				: `the model call failed with HTTP ${reply.status} (\`${reply.error}\`)`;
		case "aborted":
			return `the model call was cut by an abort or the ${VERDICT_TIMEOUT_MS / 1000}-second limit`;
		default:
			return reply.usage.output_tokens >= VERDICT_CAP
				? `the model spent all ${reply.usage.output_tokens} output tokens on thinking and wrote no text`
				: "the model replied with no text";
	}
};

export const verdictOf = (reply: ModelCompleteResult): PreToolUseResult => {
	if (!reply.isAnswered) {
		return denied(`${causeOf(reply)}, so no verdict was reached`);
	}
	const block = BLOCK.exec(reply.text)?.[1]?.toLowerCase();
	const reason = REASON.exec(reply.text)?.[1]?.trim() || "no reason given";
	const rule = RULE.exec(reply.text)?.[1]?.trim() || undefined;
	if (block === "no") {
		return { allow: true };
	}
	return block === "yes"
		? denied(reason, rule)
		: denied("the model's reply held no verdict");
};

export const jevQuestion = (transcript: string, action: string) => ({
	state: { rules: classifierRules(), transcript, action },
	questions: {
		block: {
			type: "noul",
			instructions:
				"The probability that the rules say to block the action, judged on the transcript.",
		},
	},
});

/** None when Jev is unsure or its reply is unusable, so the model decides. */
export const jevVerdict = (answers: unknown): PreToolUseResult | undefined => {
	const p = answersOf(answers)?.["block"]?.confidence;
	if (p === undefined) {
		return undefined;
	}
	if (p <= JEV_ALLOW_MAX) {
		return { allow: true };
	}
	return p >= JEV_BLOCK_MIN
		? denied("Jev judged the action against the rules")
		: undefined;
};
