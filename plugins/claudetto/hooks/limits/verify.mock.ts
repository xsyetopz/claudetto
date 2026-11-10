import type { On, SessionMessage } from "claude-code";
import type { Engine } from "claude-code/testing";

export const user = (text: string): SessionMessage => ({
	role: "user",
	text,
	toolUses: [],
});

export const used = (tool: string): SessionMessage => ({
	role: "assistant",
	text: "",
	toolUses: [{ tool, tool_use_id: "t", input: {} }],
});

export const ran = (
	tool: string,
	text: string,
	command = "git diff",
): SessionMessage => ({
	role: "assistant",
	text: "",
	toolUses: [{ tool, tool_use_id: "t", input: { command }, text }],
});

export const failedRun = (
	text: string,
	command: string,
	id = "t",
): SessionMessage => ({
	role: "assistant",
	text: "",
	toolUses: [
		{ tool: "Bash", tool_use_id: id, input: { command }, text, isError: true },
	],
});

export const answered = (tool: string, text: string): SessionMessage => ({
	role: "assistant",
	text: "",
	toolUses: [{ tool, tool_use_id: text, input: {}, text }],
});

export const REPLY =
	"Fix total() by removing slice(1). The cache never expires.";
export const UNSEEN_REPLY = "Committed. `.gitignore` also has the setup block.";

export const found = (
	code: string,
	quote = "Fix total() by removing slice(1).",
): string => JSON.stringify({ faults: [{ code, quote }] });

const USAGE = {
	input_tokens: 1,
	output_tokens: 1,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0,
} as const;

const answerOf = (verdict: string, text: string) =>
	verdict === "unanswered"
		? {
				isAnswered: false as const,
				reason: "empty-reply" as const,
				usage: USAGE,
			}
		: { isAnswered: true as const, text, usage: USAGE };

/** `verdict` is the grader's reply text, or `fail` to throw, or `unanswered`. */
export const lab = (
	on: On,
	messages: SessionMessage[],
	verdict: string,
	seen: string[] = [],
	models: string[] = [],
	byModel: Readonly<Record<string, string>> = {},
): void => {
	on("classic.Stop", () => ({}));
	on("session.messages", () => ({ value: messages }));
	on("clock.now", () => ({ value: 0 }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("session.start", () => ({ cwd: "/repo" }));
	on("model.complete", (_$, e) => {
		const model = e.model ?? "";
		seen.push(e.prompt);
		models.push(model);
		if (verdict === "fail") {
			throw new Error("timed out");
		}
		return { value: answerOf(verdict, byModel[model] ?? verdict) };
	});
};

export const stop = ($: Engine, active = false, reply = REPLY) =>
	$.classic.Stop({
		stop_hook_active: active,
		last_assistant_message: reply,
		background_tasks: [],
	});

/** The prompt that offered the unseen fault, which only the sonnet call gets. */
export const sonnetOf = (seen: readonly string[]): string =>
	seen.find((p) => p.includes("- unseen:")) ?? "";

/** The prompt sent to `model`. */
export const promptTo = (
	seen: readonly string[],
	models: readonly string[],
	model: string,
): string => seen[models.indexOf(model)] ?? "";
