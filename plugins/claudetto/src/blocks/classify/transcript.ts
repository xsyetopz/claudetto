import type { SessionMessage } from "claude-code";
import { HOOK_FEEDBACK } from "./hook-feedback.ts";
import type { MidTurnPrompt } from "./mid-turn.ts";

export const callLine = (tool: string, input: unknown): string =>
	`${tool} ${JSON.stringify(input)}`;

const userLine = (text: string): string => `User: ${text}`;

const hookLine = (text: string): string => `Hook said: ${text.trimEnd()}`;

/** A hook's text authorizes nothing, so a row whose blocks are not known stays the hook's whole. */
const rowLines = (
	text: string,
	splits: ReadonlyMap<string, readonly string[]>,
): string[] => {
	if (!text.startsWith(HOOK_FEEDBACK)) {
		return [userLine(text)];
	}
	const [hook = text, ...typed] = splits.get(text) ?? [];
	const words = typed.join("").trim();
	return [hookLine(hook), ...(words === "" ? [] : [userLine(words)])];
};

const ANSWERED = "AskUserQuestion";

const PLAN_TOOL = "ExitPlanMode";

/**
 * The harness writes an `AskUserQuestion` answer and the plan approval when the person picks, so those two results
 * are the user's words. Every other tool result stays out, because the agent can argue for itself in it.
 */
const choiceLines = (
	message: SessionMessage,
	toolOf: ReadonlyMap<string, string>,
): string[] =>
	(message.toolResults ?? []).flatMap((result) => {
		if (result.isError === true) {
			return [];
		}
		switch (toolOf.get(result.tool_use_id)) {
			case ANSWERED:
				return [userLine(`User answered ${ANSWERED}: ${result.text.trim()}`)];
			case PLAN_TOOL:
				return [userLine("User approved the plan the agent proposed above.")];
			default:
				return [];
		}
	});

/**
 * Assistant prose and other tool results stay out: the agent can argue for itself in both.
 * Its calls stay in, so a task list or plan it wrote shows what the user approved.
 * A mid-turn prompt follows the call it was typed after; one whose call is gone, or that came before any call, goes before the first call shown.
 */
export const transcriptOf = (
	messages: readonly SessionMessage[],
	midTurn: readonly MidTurnPrompt[] = [],
	splits: ReadonlyMap<string, readonly string[]> = new Map(),
): string => {
	const rowTexts = new Set(
		messages.filter((m) => m.role === "user").map((m) => m.text.trim()),
	);
	const shownCalls = new Set(
		messages.flatMap((m) => m.toolUses.map((use) => use.tool_use_id)),
	);
	const toolOf = new Map(
		messages.flatMap((m) => m.toolUses.map((u) => [u.tool_use_id, u.tool])),
	);
	const sent = midTurn.filter((p) => !rowTexts.has(p.text.trim()));
	const sentAfter = (id: string): string[] =>
		sent.filter((p) => p.after === id).map((p) => userLine(p.text));
	const early = sent
		.filter((p) => p.after === undefined || !shownCalls.has(p.after))
		.map((p) => userLine(p.text));
	const lines = messages.flatMap((message): string[] => {
		if (message.role === "assistant") {
			return message.toolUses.flatMap((use) => [
				`Agent ran: ${callLine(use.tool, use.input)}`,
				...sentAfter(use.tool_use_id),
			]);
		}
		return [
			...(message.text.trim() === "" ? [] : rowLines(message.text, splits)),
			...choiceLines(message, toolOf),
		];
	});
	const firstCall = lines.findIndex((line) => line.startsWith("Agent ran: "));
	const at = firstCall === -1 ? lines.length : firstCall;
	return [...lines.slice(0, at), ...early, ...lines.slice(at)].join("\n");
};
