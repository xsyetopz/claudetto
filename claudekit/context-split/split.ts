// The parts of a captured request that `/context` counts as "System prompt".

import { fieldOf } from "../api/json.ts";

export interface Part {
	/** `system` for a `system` block; otherwise the role of the message the text came from, with `system-role` for a `system` message. */
	readonly source: string;
	readonly text: string;
	readonly chars: number;
	/** Whether `/context` counts the part, which is every `system` block and `system-role` section but only the reminders of other messages. */
	readonly counted: boolean;
}

export interface Sums {
	readonly system: number;
	readonly reminders: number;
}

const REMINDER = "<system-reminder>";

// A `system`-role message has no tags, so its sections are told apart by the headings the CLI writes.
const SECTION =
	/(?=^#{1,2} |^The following deferred tools|^Available agent types)/m;

const part = (source: string, text: string, counted: boolean): Part => ({
	source,
	text,
	chars: text.length,
	counted,
});

const texts = (content: unknown): string[] => {
	if (typeof content === "string") {
		return [content];
	}
	return Array.isArray(content)
		? content.flatMap((block) =>
				fieldOf(block, "type") === "text"
					? [String(fieldOf(block, "text"))]
					: [],
			)
		: [];
};

const systemParts = (system: unknown): Part[] => {
	const blocks = Array.isArray(system) ? system : [system];
	return blocks
		.filter((block) => block !== undefined)
		.map((block) =>
			part(
				"system",
				String(typeof block === "string" ? block : fieldOf(block, "text")),
				true,
			),
		);
};

/** The `system` blocks, then the text of each message cut at its reminders, or at its headings for a `system` role. Takes the body or `{ body }`. */
export const splitContext = (raw: unknown): Part[] => {
	const body = fieldOf(raw, "body") ?? raw;
	const messages = fieldOf(body, "messages");
	const fromMessages = (Array.isArray(messages) ? messages : []).flatMap(
		(message) => {
			const isSystem = fieldOf(message, "role") === "system";
			const source = isSystem
				? "system-role"
				: String(fieldOf(message, "role"));
			return texts(fieldOf(message, "content")).flatMap((text) =>
				text
					.split(isSystem ? SECTION : new RegExp(`(?=${REMINDER})`))
					.filter((piece) => piece.trim() !== "")
					.map((piece) =>
						part(source, piece, isSystem || piece.startsWith(REMINDER)),
					),
			);
		},
	);
	return [...systemParts(fieldOf(body, "system")), ...fromMessages];
};

/** The characters of the `system` blocks and of the counted message parts. */
export const summarize = (parts: readonly Part[]): Sums => {
	let system = 0;
	let reminders = 0;
	for (const p of parts) {
		if (p.source === "system") {
			system += p.chars;
		} else if (p.counted) {
			reminders += p.chars;
		}
	}
	return { system, reminders };
};

/** Characters and thousands of tokens at four characters a token, which is a rough guide and not the tokenizer's count. */
export const estimateTokens = (chars: number): string =>
	`${chars} chars, ~${(chars / 4 / 1000).toFixed(2)}k tokens`;
