// The small helpers that read untrusted JSON for the claim-check run. The engine loads this module, so it uses no Bun or node API.
import { isRecord } from "../plugins/claudetto/hooks/tools.ts";

/** Throws `message`. */
export const fail = (message: string): never => {
	throw new Error(message);
};

/** The property `name` of a record, else `undefined`. */
export const field = (value: unknown, name: string): unknown =>
	isRecord(value) ? value[name] : undefined;

/** `value` as a list of strings, else an error. */
export const strings = (value: unknown): string[] =>
	Array.isArray(value) && value.every((item) => typeof item === "string")
		? value
		: fail("A case field is not a list of strings.");

/** The non-empty lines of a JSONL text. */
export const lines = (text: string): string[] =>
	text.split("\n").filter((line) => line.trim() !== "");
