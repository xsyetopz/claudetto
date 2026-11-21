/** Bytes of a `tools` array and of each tool in it. */
export interface ToolBytes {
	readonly count: number;
	/** `JSON.stringify(tools).length`. */
	readonly total: number;
	/** UTF-8 bytes of the same text. */
	readonly utf8: number;
	readonly perTool: Readonly<Record<string, number>>;
}

/**
 * Narrows a parsed JSON value to an object.
 *
 * @param value Any parsed value.
 * @returns Whether it is a non-null, non-array object.
 */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const nameOf = (tool: unknown): string =>
	isRecord(tool) && typeof tool["name"] === "string" ? tool["name"] : "?";

/**
 * Sizes a request's tools array.
 *
 * @param tools The `tools` field of a request body.
 * @returns The total and the per-tool JSON length.
 */
export function measureTools(tools: readonly unknown[]): ToolBytes {
	const text = JSON.stringify(tools);
	return {
		count: tools.length,
		total: text.length,
		utf8: new TextEncoder().encode(text).length,
		perTool: Object.fromEntries(
			tools.map((tool) => [nameOf(tool), JSON.stringify(tool).length])
		)
	};
}

/**
 * The `tools` field of a request body.
 *
 * @param body A parsed request body.
 * @returns The tools array, empty when the body has none.
 */
export function toolsOf(body: Readonly<Record<string, unknown>>): unknown[] {
	const tools = body["tools"];
	return Array.isArray(tools) ? tools : [];
}

const strings = (value: unknown): string[] => {
	if (typeof value === "string") {
		return [value];
	}
	if (Array.isArray(value)) {
		return value.flatMap((item: unknown) => strings(item));
	}
	if (isRecord(value)) {
		return Object.values(value).flatMap((item) => strings(item));
	}
	return [];
};

/**
 * The text of the message that lists the deferred tools by name.
 *
 * @param messages The `messages` field of a request body.
 * @returns The first string that mentions deferred tools, or undefined when the request has none.
 */
export const deferredListing = (messages: unknown): string | undefined =>
	strings(messages).find((text) => text.includes("deferred tools"));
