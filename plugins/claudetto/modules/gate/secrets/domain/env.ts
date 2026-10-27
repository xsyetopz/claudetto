// The values of env files, and their removal from a text: the model may load a key, but it never reads a value (task 19.16 of change `redesign-0-4-0`).
// A value that a program changes first, such as reversed, split, or encoded in a form other than base64, is not found.

import {
	ENV_SHORT_MIN,
	ENV_VALUE_MIN,
	RESULT_DEPTH_MAX,
} from "../../limits.ts";
import { MASKED } from "../../prompts.ts";

/** A value of an env file with its key. */
export interface Entry {
	readonly key: string;
	readonly value: string;
}

/** A text to find, the text in its place, and whether the text counts only as a whole word. */
export type Mask = readonly [needle: string, mark: string, word: boolean];

/** A key name that says its value is secret, so that a short value of it is replaced. */
const SECRET_KEY = /KEY|TOKEN|SECRET|PASS|PWD|AUTH|CREDENTIAL|PRIVATE/i;

const WORD_EDGE = "[A-Za-z0-9_]";

const LINE = /^\s*(?:export\s+)?([A-Za-z_][\w.-]*)\s*=\s*(.*)$/;
const LINE_BREAK = /\r?\n/;
const TRAILING_COMMENT = /\s+#.*$/;

/** The text between the quote that opens `rest` and the next one, or `undefined` for a quote that stays open. */
const quoted = (rest: string, quote: string): string | undefined => {
	const end = rest.indexOf(quote, 1);
	return end < 0 ? undefined : rest.slice(1, end);
};

/** The entries of the text of an env file: `KEY=value` lines with `export`, quotes, comments, and a quoted value over several lines. */
export const parseEnv = (text: string): Entry[] => {
	const lines = text.split(LINE_BREAK);
	const entries: Entry[] = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		const m = LINE.exec(line);
		if (!m || line.trimStart().startsWith("#")) {
			continue;
		}
		const [, key = "", raw = ""] = m;
		const rest = raw.trim();
		const quote = rest[0];
		if (quote === '"' || quote === "'") {
			let value = quoted(rest, quote);
			let body = rest;
			while (value === undefined && i + 1 < lines.length) {
				body += `\n${lines[++i]}`;
				value = quoted(body, quote);
			}
			entries.push({ key, value: value ?? rest.slice(1) });
		} else {
			entries.push({ key, value: rest.replace(TRAILING_COMMENT, "").trim() });
		}
	}
	return entries;
};

const ALPHABET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** The base64 of the UTF-8 bytes of `text`, with the padding when `pad` is set. */
export const base64 = (text: string, pad = true): string => {
	const bytes = new TextEncoder().encode(text);
	let out = "";
	for (let i = 0; i < bytes.length; i += 3) {
		const n =
			((bytes[i] ?? 0) << 16) |
			((bytes[i + 1] ?? 0) << 8) |
			(bytes[i + 2] ?? 0);
		const have = Math.min(3, bytes.length - i) + 1;
		out += [18, 12, 6, 0]
			.slice(0, have)
			.map((s) => ALPHABET[(n >> s) & 63])
			.join("");
		if (pad) {
			out += "=".repeat(4 - have);
		}
	}
	return out;
};

/** The texts to find for `entries`, as `[needle, key]`: for each value of `ENV_VALUE_MIN` or more characters, or `ENV_SHORT_MIN` or more under a secret key name, the value, its lines, and its base64 form. */
export const needlesOf = (
	entries: readonly Entry[],
): [needle: string, key: string][] => {
	const found: [string, string][] = [];
	for (const { key, value } of entries) {
		const min = SECRET_KEY.test(key) ? ENV_SHORT_MIN : ENV_VALUE_MIN;
		if (value.length < min) {
			continue;
		}
		const lines = value.includes("\n") ? value.split("\n") : [];
		for (const needle of [
			value,
			...lines.map((l) => l.trim()).filter((l) => l.length >= min),
			base64(value),
			base64(value, false),
		]) {
			found.push([needle, key]);
		}
	}
	return found;
};

/** The masks of `entries`, the longest first, so a value inside another value does not split it. The first key of a value names it. A needle shorter than `ENV_VALUE_MIN` is a whole-word mask. */
export const masksOf = (entries: readonly Entry[]): Mask[] => {
	const seen = new Map<string, Mask>();
	for (const [needle, key] of needlesOf(entries)) {
		if (!seen.has(needle)) {
			seen.set(needle, [
				needle,
				MASKED({ key }),
				needle.length < ENV_VALUE_MIN,
			]);
		}
	}
	return [...seen.values()].sort((a, b) => b[0].length - a[0].length);
};

const escaped = (text: string): string =>
	text.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");

/** `text` with each needle of `masks` replaced by its mark. */
export const scrub = (text: string, masks: readonly Mask[]): string => {
	let out = text;
	for (const [needle, mark, word] of masks) {
		if (!out.includes(needle)) {
			continue;
		}
		out = word
			? out.replace(
					new RegExp(
						`(?<!${WORD_EDGE})${escaped(needle)}(?!${WORD_EDGE})`,
						"g",
					),
					() => mark,
				)
			: out.replaceAll(needle, () => mark);
	}
	return out;
};

/** `value` with each string cleaned, in objects and arrays down to `RESULT_DEPTH_MAX`. A value with nothing to clean is the same value, so a caller tells a change by `!==`. */
export const scrubDeep = (
	value: unknown,
	clean: (text: string) => string,
	depth = 0,
): unknown => {
	if (typeof value === "string") {
		return clean(value);
	}
	if (
		depth >= RESULT_DEPTH_MAX ||
		value === null ||
		typeof value !== "object"
	) {
		return value;
	}
	if (Array.isArray(value)) {
		const items = value.map((v) => scrubDeep(v, clean, depth + 1));
		return items.some((v, i) => v !== value[i]) ? items : value;
	}
	const fields = Object.entries(value);
	const cleaned = fields.map(([, v]) => scrubDeep(v, clean, depth + 1));
	return cleaned.some((v, i) => v !== fields[i]?.[1])
		? Object.fromEntries(fields.map(([k], i) => [k, cleaned[i]]))
		: value;
};
