import type { Schema } from "./types.ts";

const CAMEL_CASE = /[a-z][A-Z]/;
const CODE_SPAN = /(`[^`]*`)/;

const TOOLS = [
	"AskUserQuestion",
	"EnterPlanMode",
	"EnterWorktree",
	"ExitPlanMode",
	"ExitWorktree",
	"ListAgents",
	"NotebookEdit",
	"SendFeedback",
	"SendMessage",
	"TodoWrite",
	"ToolSearch",
	"WebFetch",
	"WebSearch",
];

const PATTERNS = [
	String.raw`\b[A-Z][A-Za-z]+\([^()]*\)`,
	String.raw`\b(?:${TOOLS.join("|")})\b`,
	String.raw`https?://[^\s)"'\]]+[^\s)"'\].,;:]`,
	String.raw`\b[A-Z]:/(?:Program Files/)?[\w.\-/]*\w`,
	String.raw`(?<![\w/.\-])(?:~|\.{1,2})?/[\w.\-*/@{}]*[\w*}]`,
	String.raw`(?<![\w/])\.[a-z][\w\-]*(?:[./][\w\-*]+)*`,
	String.raw`\b[\w\-]+(?:\.[\w\-]+)*\.(?:json|jsonl|md|mjs|js|ts|sh|ps1|yaml|yml|toml|txt|plist|exe)\b`,
	String.raw`(?<![\w\-])--?[a-z](?:[a-z\-]*[a-z])?\b`,
	String.raw`\b[A-Z][A-Z0-9]*_[A-Z0-9_]*[A-Z0-9]\b(?:=[\w.]+)?`,
	String.raw`\b[a-z][a-z0-9]*_[a-z0-9_]*[a-z0-9]\b`,
	String.raw`\b(?:true|false)\b`,
	String.raw`\b(?<word>[a-zA-Z]\w*(?:\.[a-zA-Z]\w*)*)\b`,
];
const ITEM = new RegExp(PATTERNS.join("|"), "g");

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === "object" && v !== null;

const isSchema = (v: unknown): v is Schema => isRecord(v);

/** The `word` group of the named groups, which are the last argument of a `replace` callback. */
const groupWord = (rest: unknown[]): string | undefined => {
	const groups = rest.at(-1);
	return isRecord(groups) && typeof groups["word"] === "string"
		? groups["word"]
		: undefined;
};

const keyNames = (
	schema: unknown,
	out: Set<string> = new Set(),
): Set<string> => {
	if (!isSchema(schema)) {
		return out;
	}
	const node: Schema = schema;
	for (const [key, sub] of Object.entries(node.properties ?? {})) {
		out.add(key);
		keyNames(sub, out);
	}
	if (node.items) {
		keyNames(node.items, out);
	}
	if (node.additionalProperties) {
		keyNames(node.additionalProperties, out);
	}
	for (const alt of node.anyOf ?? []) {
		keyNames(alt, out);
	}
	return out;
};

const isKey = (word: string, keys: Set<string>): boolean => {
	const head = word.split(".")[0] ?? "";
	if (!keys.has(head)) {
		return false;
	}
	return word.includes(".") || CAMEL_CASE.test(word);
};

export const wrapCodeSpans = (text: string, keys: Set<string>): string =>
	text
		.replace(/\{[^{}`]*"[^{}`]*\}/g, (json) => `\`${json}\``)
		.split(CODE_SPAN)
		.map((part, i) =>
			i % 2 === 1
				? part
				: part
						.replace(/(?<!\w)'([^'\s]+)'(?!\w)/g, "`$1`")
						.replace(/"([^"\s]+)"/g, "`$1`"),
		)
		.join("")
		.split(CODE_SPAN)
		.map((part, i) =>
			i % 2 === 1
				? part
				: part.replace(ITEM, (item: string, ...rest: unknown[]) =>
						groupWord(rest) === undefined || isKey(item, keys)
							? `\`${item}\``
							: item,
					),
		)
		.join("");

const spanned = (schema: unknown, keys: Set<string>): unknown => {
	if (Array.isArray(schema)) {
		return schema.map((item) => spanned(item, keys));
	}
	if (!schema || typeof schema !== "object") {
		return schema;
	}
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(schema)) {
		if (key === "description" && typeof value === "string") {
			out[key] = wrapCodeSpans(value, keys);
		} else if (key === "properties" && isRecord(value)) {
			out[key] = Object.fromEntries(
				Object.entries(value).map(([k, v]) => [k, spanned(v, keys)]),
			);
		} else {
			out[key] = spanned(value, keys);
		}
	}
	return out;
};

export const applyCodeSpans = (
	schema: Schema,
	keys: Set<string> = keyNames(schema),
): Schema => {
	const out = spanned(schema, keys);
	return isSchema(out) ? out : schema;
};
