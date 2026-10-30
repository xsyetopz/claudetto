// Every path that reaches no verdict denies, because an unwatched session cannot answer a prompt.

import type {
	ModelCompleteRequest,
	ModelCompleteResult,
	ModelEffort,
	PreToolUseResult,
	SessionMessage,
	ToolCallEnvelope,
} from "claude-code";
import { answersOf } from "../decide/ask.ts";
import { classifierRules } from "./prompt.ts";

export const VARIANTS = {
	haiku: { model: "claude-haiku-5-5", effort: "high" },
	sonnet: { model: "claude-sonnet-5-5", effort: "medium" },
} as const satisfies Record<
	string,
	{ readonly model: string; readonly effort: ModelEffort }
>;

export type Variant = keyof typeof VARIANTS;

/** Tools that read and change nothing, which the built-in classifier also never sees. */
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

const VERDICT_MAX_TOKENS = 200;

const VERDICT_TIMEOUT_MS = 30_000;

export const denied = (reason: string): PreToolUseResult => ({
	deny: `claudetto classifier: ${reason}`,
});

const callLine = (tool: string, input: unknown): string =>
	`${tool} ${JSON.stringify(input)}`;

/** Assistant prose and tool results stay out: the agent can argue for itself in both. */
export const transcriptOf = (messages: readonly SessionMessage[]): string =>
	messages
		.flatMap((message) => {
			if (message.role === "assistant") {
				return message.toolUses.map(
					(use) => `Agent ran: ${callLine(use.tool, use.input)}`,
				);
			}
			return message.text.trim() === "" ? [] : [`User: ${message.text}`];
		})
		.join("\n");

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

export const verdictOf = (reply: ModelCompleteResult): PreToolUseResult => {
	if (!reply.isAnswered) {
		return denied("the model gave no answer");
	}
	const block = BLOCK.exec(reply.text)?.[1]?.toLowerCase();
	const reason = REASON.exec(reply.text)?.[1]?.trim() || "no reason given";
	if (block === "no") {
		return { allow: true };
	}
	return block === "yes"
		? denied(reason)
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
