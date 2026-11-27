/** A tool call as a row or group member carries it. */
export interface Call {
	tool: string;
	input: unknown;
	isRunning: boolean;
	isErrored: boolean;
	isInterrupted: boolean;
}

interface Kind {
	verb: string;
	noun: string;
	subjects: (input: Record<string, unknown>, isGrouped: boolean) => string[];
}

const MAX_COMMAND = 50;
const MAX_SUBJECTS = 4;

const text = (value: unknown): string =>
	typeof value === "string" ? value : "";
const base = (path: string): string => path.split("/").pop() ?? path;

const recordOf = (value: unknown): Record<string, unknown> =>
	typeof value === "object" && value !== null
		? Object.fromEntries(Object.entries(value))
		: {};

/** The program of a command line, or its first line cut short. */
const commandOf = (input: Record<string, unknown>, isGrouped: boolean) => {
	const line = text(input["command"]).split("\n")[0]?.trim() ?? "";
	if (isGrouped) {
		return [line.split(/\s+/u)[0] ?? ""];
	}
	return [
		line.length > MAX_COMMAND ? `${line.slice(0, MAX_COMMAND - 1)}…` : line
	];
};

const fileOf =
	(...keys: string[]) =>
	(input: Record<string, unknown>) => [
		base(text(keys.map((key) => input[key]).find((v) => text(v) !== "")))
	];

const HEADER = /^\*\*\* (?:Add|Update|Delete) File: (.+)$/u;

/** The paths on a patch's file header lines. */
const patchedFiles = (input: Record<string, unknown>): string[] =>
	text(input["patch"])
		.split("\n")
		.flatMap((line) => {
			const path = HEADER.exec(line)?.[1];
			return path === undefined ? [] : [base(path.trim())];
		});

const patternOf = (input: Record<string, unknown>) => [text(input["pattern"])];

const FILES = { verb: "Edited", noun: "file" };
const KINDS: Record<string, Kind> = {
	Bash: { verb: "Ran", noun: "command", subjects: commandOf },
	Read: { verb: "Read", noun: "file", subjects: fileOf("file_path") },
	mcp__claudetto__read: {
		verb: "Read",
		noun: "file",
		subjects: fileOf("file_path")
	},
	Edit: { ...FILES, subjects: fileOf("file_path") },
	Write: { ...FILES, subjects: fileOf("file_path") },
	NotebookEdit: { ...FILES, subjects: fileOf("notebook_path", "file_path") },
	mcp__claudetto__patch: { ...FILES, subjects: patchedFiles },
	Grep: { verb: "Searched", noun: "pattern", subjects: patternOf },
	Glob: { verb: "Searched", noun: "pattern", subjects: patternOf },
	Agent: {
		verb: "Delegated",
		noun: "task",
		subjects: (input) => [text(input["description"])].filter(Boolean)
	}
};

/** The tool's name without its `mcp__<server>__` prefix. */
export const shortName = (tool: string): string =>
	tool.startsWith("mcp__") ? tool.split("__").slice(2).join("__") : tool;

const kindOf = (tool: string): Kind =>
	KINDS[tool] ?? {
		verb: "Called",
		noun: "tool",
		subjects: () => [shortName(tool)]
	};

/** `x`, or `x ×n` for n equal subjects; at most four, then `+k`. */
const joined = (subjects: string[]): string => {
	const counts = new Map<string, number>();
	for (const subject of subjects) {
		counts.set(subject, (counts.get(subject) ?? 0) + 1);
	}
	const shown = [...counts]
		.slice(0, MAX_SUBJECTS)
		.map(([subject, n]) => (n > 1 ? `${subject} ×${n}` : subject));
	const hidden = counts.size - shown.length;
	return [...shown, ...(hidden > 0 ? [`+${hidden}`] : [])].join(" · ");
};

/** The one-line summary of calls: `Read 3 files (a.ts · b.ts ×2), searched 1 pattern (foo)`. */
export function summary(calls: readonly Call[], isGrouped: boolean): string {
	const parts = new Map<string, { noun: string; subjects: string[] }>();
	for (const call of calls) {
		const kind = kindOf(call.tool);
		const input = recordOf(call.input);
		const found = kind.subjects(input, isGrouped);
		const part = parts.get(kind.verb) ?? { noun: kind.noun, subjects: [] };
		part.subjects.push(...(found.length > 0 ? found : [shortName(call.tool)]));
		parts.set(kind.verb, part);
	}
	return [...parts]
		.map(([verb, { noun, subjects }], index) => {
			const label = index === 0 ? verb : verb.toLowerCase();
			const n = subjects.length;
			return `${label} ${n} ${noun}${n === 1 ? "" : "s"} (${joined(subjects)})`;
		})
		.join(", ");
}
