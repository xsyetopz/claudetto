import { clean } from "./width.ts";

/** A JSON object of unknown fields; the status line trusts none of them. */
export type Rec = Readonly<Record<string, unknown>>;

const isRec = (value: unknown): value is Rec =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** The object `value` is, or `undefined` for anything else. */
export const rec = (value: unknown): Rec | undefined =>
	isRec(value) ? value : undefined;

/** The child object `key` of `from`. */
export const sub = (from: Rec | undefined, key: string): Rec | undefined =>
	rec(from?.[key]);

/** A finite number, or `undefined`. */
export const num = (value: unknown): number | undefined =>
	typeof value === "number" && Number.isFinite(value) ? value : undefined;

/** A string made safe to print and not empty, or `undefined`. */
export const str = (value: unknown): string | undefined => {
	const text = typeof value === "string" ? clean(value) : "";
	return text === "" ? undefined : text;
};

/** The object in `raw`, or `undefined` for empty text, text that is not JSON, and JSON that is not an object. */
export const parse = (raw: string): Rec | undefined => {
	try {
		return rec(JSON.parse(raw));
	} catch {
		return undefined;
	}
};
