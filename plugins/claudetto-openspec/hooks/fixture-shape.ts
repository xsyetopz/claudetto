// Checks at the one boundary where recorded JSON enters the replay: each reader names the shape it needs and throws on another.
import type { Issue, Report } from "./spec-rules.ts";
import type { Doc } from "./tasks.ts";

export interface Update {
	id: string;
	source: string;
	target: string;
	targetRoot: string;
}

const LEVELS = new Set(["ERROR", "WARNING", "INFO"]);

export const isObject = (v: unknown): v is Record<string, unknown> =>
	typeof v === "object" && v !== null && !Array.isArray(v);

export const object = (v: unknown) => {
	if (!isObject(v)) {
		throw new TypeError("a recorded value is not an object");
	}
	return v;
};

export const items = (v: unknown): unknown[] => {
	if (!Array.isArray(v)) {
		throw new TypeError("a recorded value is not a list");
	}
	const list: unknown[] = v;
	return list;
};

export const str = (v: unknown) => {
	if (typeof v !== "string") {
		throw new TypeError("a recorded value is not a string");
	}
	return v;
};

// A string member of a recorded object, or nothing where the value is no object or lacks it.
export const option = (v: unknown, key: string) => {
	const member = isObject(v) ? v[key] : undefined;
	return typeof member === "string" ? member : undefined;
};

export const returned = (expected: unknown) => object(expected)["returned"];

const isIssue = (v: unknown): v is Issue =>
	isObject(v) &&
	typeof v["level"] === "string" &&
	LEVELS.has(v["level"]) &&
	typeof v["path"] === "string" &&
	typeof v["message"] === "string";

export const reportOf = (expected: unknown): Report => {
	const recorded = object(returned(expected));
	const all = items(recorded["issues"]);
	const issues = all.filter((v): v is Issue => isIssue(v));
	const valid = recorded["valid"];
	if (typeof valid !== "boolean" || issues.length !== all.length) {
		throw new TypeError("a recorded report is malformed");
	}
	return { valid, issues };
};

export const docs = (v: unknown): Doc[] =>
	items(v).map((d) => ({
		path: str(object(d)["path"]),
		content: str(object(d)["content"]),
	}));

export const update = (v: unknown): Update => {
	const u = object(v);
	return {
		id: str(u["id"]),
		source: str(u["source"]),
		target: str(u["target"]),
		targetRoot: typeof u["targetRoot"] === "string" ? u["targetRoot"] : "",
	};
};

// The call a record wraps: its argument list and whether it ran strict.
export const wrapped = (args: unknown) => {
	const call = object(args);
	return { list: items(call["args"]), strict: call["strict"] === true };
};
