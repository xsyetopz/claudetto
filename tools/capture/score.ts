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

const prop = (value: unknown, key: string): unknown =>
	typeof value === "object" && value !== null && key in value
		? Reflect.get(value, key)
		: undefined;

const blockTexts = (system: unknown): string[] =>
	Array.isArray(system)
		? system.map((block) => String(prop(block, "text") ?? ""))
		: [String(system ?? "")];

/** In characters, not tokens. Throws on text that is not JSON. */
export const scoreOf = (raw: string): Score => {
	const body: unknown = JSON.parse(raw);
	const texts = blockTexts(prop(body, "system"));
	const tools = prop(body, "tools");
	const list = Array.isArray(tools) ? tools : [];
	return {
		total: raw.length,
		system: texts.join("").length,
		blocks: texts.map((text) => text.length),
		tools: jsonChars(tools),
		toolCount: list.length,
		messages: jsonChars(prop(body, "messages")),
		perTool: list
			.map((tool) => ({
				name: String(prop(tool, "name") ?? "?"),
				chars: jsonChars(tool),
				desc: String(prop(tool, "description") ?? "").length,
			}))
			.sort((a, b) => b.chars - a.chars),
	};
};

const CLASSIFIER_OPENING =
	"You are a security monitor for autonomous AI coding agents.";

/** The classifier sends no tools and has no fixed position among the requests, so its text names it. */
export const isClassifier = (raw: string): boolean =>
	blockTexts(prop(JSON.parse(raw), "system")).some((text) =>
		text.startsWith(CLASSIFIER_OPENING),
	);
