import type { ToolCallResult } from "claude-code";

/** Keys whose strings hold encoded binary (an image's base64): no secret shape applies, and a replacement would corrupt the data. */
const BINARY = new Set(["base64"]);

/**
 * Applies `mask` to every string in a tool's record, keeping its keys and types so
 * core's output-schema check still accepts it.
 *
 * @param value The tool's record, or any part of it.
 * @param mask Rewrites one string.
 * @returns `value` itself when no string changed, so the caller can tell a masked record by identity.
 */
export const maskRecord = (
	value: unknown,
	mask: (text: string) => string
): unknown => {
	if (typeof value === "string") {
		return mask(value);
	}
	if (Array.isArray(value)) {
		const out = value.map((item: unknown) => maskRecord(item, mask));
		return out.some((item, i) => item !== value[i]) ? out : value;
	}
	if (value === null || typeof value !== "object") {
		return value;
	}
	const entries = Object.entries(value);
	const out = entries.map(
		([key, item]) =>
			[key, BINARY.has(key) ? item : maskRecord(item, mask)] as const
	);
	return out.some(([, item], i) => item !== entries[i]?.[1])
		? Object.fromEntries(out)
		: value;
};

/**
 * Masks one `tool.call` answer: the record core stores as the transcript row's
 * `toolUseResult` and maps for the model, or an error's text.
 *
 * A changed record goes back as the hook's own `{ result }`, which core validates,
 * maps with the tool's mapper and records in the transcript (ToolCallResult, 2.1.327).
 * An error cannot be answered as an error, so a changed error text goes back as a
 * `deny`: the model still reads an error result, wrapped in `<tool_use_error>`.
 *
 * @param answer What `next(e)` resolved to.
 * @param mask Rewrites one string.
 * @returns `answer` itself when nothing was masked, so core keeps its own messages and flags.
 */
export const maskAnswer = (
	answer: ToolCallResult,
	mask: (text: string) => string
): ToolCallResult => {
	if (answer.deny !== undefined) {
		return answer;
	}
	if (answer.isError === true) {
		const text = answer.text ?? "";
		const masked = mask(text);
		return masked === text ? answer : { deny: masked };
	}
	const result = maskRecord(answer.result, mask);
	if (result === answer.result) {
		return answer;
	}
	return answer.context === undefined
		? { result }
		: { result, context: answer.context };
};

/** The text a scanner reads for one answer: core's model-facing text, else the record as JSON; empty on a deny. */
export const answerText = (answer: ToolCallResult): string => {
	if (answer.deny !== undefined) {
		return "";
	}
	if (answer.text !== undefined) {
		return answer.text;
	}
	return typeof answer.result === "string"
		? answer.result
		: (JSON.stringify(answer.result) ?? "");
};
