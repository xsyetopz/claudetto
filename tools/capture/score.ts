import { fieldOf } from "../../claudekit/api/json.ts";
import { systemTexts } from "../../claudekit/api/match.ts";

export interface ToolSize {
	readonly name: string;
	readonly chars: number;
	readonly desc: number;
}

export interface Score {
	readonly total: number;
	readonly system: number;
	readonly blocks: readonly number[];
	readonly tools: number;
	readonly toolCount: number;
	readonly messages: number;
	readonly perTool: readonly ToolSize[];
}

const jsonChars = (value: unknown): number =>
	JSON.stringify(value ?? null).length;

/** In characters, not tokens. Throws on text that is not JSON. */
export const scoreOf = (raw: string): Score => {
	const body: unknown = JSON.parse(raw);
	const texts = systemTexts(body);
	const tools = fieldOf(body, "tools");
	const list = Array.isArray(tools) ? tools : [];
	return {
		total: raw.length,
		system: texts.join("").length,
		blocks: texts.map((text) => text.length),
		tools: jsonChars(tools),
		toolCount: list.length,
		messages: jsonChars(fieldOf(body, "messages")),
		perTool: list
			.map((tool) => ({
				name: String(fieldOf(tool, "name") ?? "?"),
				chars: jsonChars(tool),
				desc: String(fieldOf(tool, "description") ?? "").length,
			}))
			.sort((a, b) => b.chars - a.chars),
	};
};
