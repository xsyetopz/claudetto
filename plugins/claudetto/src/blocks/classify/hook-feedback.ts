import type { ApiMessage, SessionMessage } from "claude-code";

export const HOOK_FEEDBACK = "Stop hook feedback:";

const textsOf = (message: ApiMessage): string[] =>
	message.content.flatMap((block) => {
		const text = block["text"];
		return block.type === "text" && typeof text === "string" ? [text] : [];
	});

export const needsBlocks = (rows: readonly SessionMessage[]): boolean =>
	rows.some((row) => row.role === "user" && row.text.startsWith(HOOK_FEEDBACK));

/**
 * The harness appends what the user types after hook feedback to the same message, and the row form joins its text
 * blocks with nothing between them, so only the blocks show where the hook's text ends and the user's words begin.
 * Each entry maps a joined row text to its blocks.
 */
export const hookSplitsOf = (
	messages: readonly ApiMessage[],
): ReadonlyMap<string, readonly string[]> =>
	new Map(
		messages.flatMap((message) => {
			const texts = textsOf(message);
			return message.role === "user" && texts[0]?.startsWith(HOOK_FEEDBACK)
				? [[texts.join(""), texts] as const]
				: [];
		}),
	);
