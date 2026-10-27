// The handoff file (design D13, spec `handover`): its path, and the messages that code compaction keeps after the handoff message.

import type { SessionMessage } from "claude-code";
import { HANDOFF_DIR } from "../../project/domain/paths.ts";
import { CHARS_PER_TOKEN, TAIL_TOKENS } from "./limits.ts";

const STAMP_PUNCTUATION = /[-:]/g;
const STAMP_FRACTION = /\.\d+/;

/** `text` cut to `max` characters, with `...` at the cut. */
export const clip = (text: string, max: number): string =>
	text.length > max ? `${text.slice(0, max)}...` : text;

/**
 * The entries of `items` that fit `budget` tokens, in their order. All of them when they fit.
 * Else the newest and the oldest in turn, so an early entry survives as often as a late one, and the middle gives way.
 */
export const spread = <T>(
	items: readonly T[],
	budget: number,
	textOf: (item: T) => string,
): T[] => {
	const cost = items.map((item) => tokensOf(textOf(item)) + 1);
	let left = budget;
	const kept = new Set<number>();
	let low = 0;
	let high = items.length - 1;
	let fromEnd = true;
	while (low <= high) {
		const at = fromEnd ? high : low;
		if ((cost[at] ?? 0) > left) {
			break;
		}
		left -= cost[at] ?? 0;
		kept.add(at);
		if (fromEnd) {
			high--;
		} else {
			low++;
		}
		fromEnd = !fromEnd;
	}
	return items.filter((_, i) => kept.has(i));
};

/** The path from the project root, such as `.claude/claudetto/handoffs/handoff-20261015T101010Z.md` (UTC). */
export const handoffPath = (now: Date): string => {
	const stamp = now
		.toISOString()
		.replace(STAMP_PUNCTUATION, "")
		.replace(STAMP_FRACTION, "");
	return `${HANDOFF_DIR}/handoff-${stamp}.md`;
};

/** The tokens of `text`, estimated from its length. */
export const tokensOf = (text: string): number =>
	Math.ceil(text.length / CHARS_PER_TOKEN);

/** The tokens of a message: its text, its tool calls, and its tool results. The text of a result counts once: an answered call holds it in `text` on its own row, and the row of the result holds it in `toolResults`, so only `toolResults` counts. */
export const messageTokens = (m: SessionMessage): number => {
	let total = tokensOf(m.text);
	for (const use of m.toolUses) {
		total += tokensOf(JSON.stringify(use.input ?? {}));
	}
	for (const r of m.toolResults ?? []) {
		total += tokensOf(r.text);
	}
	return total;
};

/**
 * The newest messages of `messages` that fit `budget` tokens, with at least the last one, so it can be over the budget (`compactionOf` checks).
 * A `tool_result` stays with its `tool_use`: when the cut falls between them, the tail starts earlier, at the message of the call.
 */
export const tailOf = (
	messages: readonly SessionMessage[],
	budget: number,
): SessionMessage[] => {
	let start = messages.length;
	let used = 0;
	while (start > 0) {
		const last = messages[start - 1];
		const size = last ? messageTokens(last) : 0;
		if (used + size > budget && start < messages.length) {
			break;
		}
		used += size;
		start--;
	}
	const isOrphan = (from: number) => {
		const made = new Set(
			messages.slice(from).flatMap((m) => m.toolUses.map((u) => u.tool_use_id)),
		);
		return messages
			.slice(from)
			.some((m) => (m.toolResults ?? []).some((r) => !made.has(r.tool_use_id)));
	};
	while (start > 0 && isOrphan(start)) {
		start--;
	}
	return messages.slice(start);
};

/** The answer of code compaction: the handoff message `text`, then the tail of `messages`, with the size before and after. Gives the cause as a string when the tail is over `TAIL_TOKENS`, or when the result is not below half of the size before, so that the caller runs the built-in compaction. */
export const compactionOf = (
	messages: readonly SessionMessage[],
	text: string,
) => {
	const tail = tailOf(messages, TAIL_TOKENS);
	const sum = (list: readonly SessionMessage[]) => {
		let total = 0;
		for (const m of list) {
			total += messageTokens(m);
		}
		return total;
	};
	const tokensBefore = sum(messages);
	const kept = sum(tail);
	const tokensAfter = tokensOf(text) + kept;
	if (kept > TAIL_TOKENS) {
		return `the tail is ${kept} tokens, over ${TAIL_TOKENS}`;
	}
	if (tokensAfter * 2 >= tokensBefore) {
		return `the result is ${tokensAfter} of ${tokensBefore} tokens, not below half`;
	}
	const isTool = (m: SessionMessage) =>
		m.toolUses.length > 0 || (m.toolResults?.length ?? 0) > 0;
	const before = messages[messages.length - tail.length - 1];
	// The engine joins the rows of one `message.id`, and their results, from before the boundary too. Parallel calls share one id, so a cut inside them leaves siblings behind. The leading run of tool messages after a cut that does not follow a user prompt loses its `handle`.
	const split =
		before !== undefined &&
		(before.role !== "user" || (before.toolResults?.length ?? 0) > 0);
	const lead = split ? tail.findIndex((m) => !isTool(m)) : 0;
	const leading = lead === -1 ? tail.length : lead;
	return {
		// A row with the `handle` comes back whole (thinking, attachments), but a stored `tool_result` row keeps its old `sourceToolAssistantUUID`, and so its old parent before the boundary. Those rows, and the leading run above, lose the `handle`: the engine rebuilds them from `text` and `toolResults`, and they link in order after the boundary. The rebuilt row holds no image, no other non-text content, and no attachment row after it, because `SessionMessage` holds none of them.
		messages: [
			{ role: "user" as const, text, toolUses: [] },
			...tail.map((message, i) => {
				const { handle: _handle, ...rebuilt } = message;
				return i < leading || (message.toolResults?.length ?? 0) > 0
					? rebuilt
					: message;
			}),
		],
		tokensBefore,
		tokensAfter,
	};
};
