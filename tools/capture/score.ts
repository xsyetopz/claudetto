// The request score: the characters of the first request, split into `system`, `tools`, and
// `messages`. It is the instrument that every later size claim of `surface-trim` reads, so it is
// pure and takes the raw request body as text.

/** One tool definition of the request, with the characters its JSON costs. */
export interface ToolSize {
	readonly name: string;
	readonly chars: number;
	/** The characters of the tool's `description` alone, which `tool.describe` replaces. */
	readonly desc: number;
}

/** The sizes of one request body in characters, split by the part of the request that holds them. */
export interface Score {
	/** The characters of the whole request body, which is what the wire carries. */
	readonly total: number;
	/** The characters of the system text, with the blocks joined and no JSON punctuation. */
	readonly system: number;
	/** The characters of each system block, in the order the request holds them. */
	readonly blocks: readonly number[];
	/** The characters of the `tools` array as JSON. */
	readonly tools: number;
	/** How many tools the request offers. */
	readonly toolCount: number;
	/** The characters of the `messages` array as JSON. */
	readonly messages: number;
	/** Each tool with its own characters, the largest first. */
	readonly perTool: readonly ToolSize[];
}

const jsonChars = (value: unknown): number =>
	JSON.stringify(value ?? null).length;

/** The value of `key` in `value`, or none when `value` is not an object that holds it. */
const prop = (value: unknown, key: string): unknown =>
	typeof value === "object" && value !== null && key in value
		? Reflect.get(value, key)
		: undefined;

/** The text of each `system` block, whether the request sends one string or a list of blocks. */
const blockTexts = (system: unknown): string[] =>
	Array.isArray(system)
		? system.map((block) => String(prop(block, "text") ?? ""))
		: [String(system ?? "")];

/** The `Score` of one captured request body, in characters and not tokens. It throws on text that is not JSON. */
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
