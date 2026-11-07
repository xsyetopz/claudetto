import { GATE_RECREATE } from "../texts.ts";
import { operands, writeTargets } from "./rules.ts";
import { parse, programOf } from "./shell-words.ts";
import { ask, type Verdict } from "./verdict.ts";

const FILE_TOOLS = new Set(["Read", "Write", "Edit", "NotebookEdit"]);

const field = (input: unknown, key: string): string | undefined => {
	const v =
		typeof input === "object" && input !== null
			? Object.entries(input).find(([k]) => k === key)?.[1]
			: undefined;
	return typeof v === "string" ? v : undefined;
};

// The hooks module cannot import `node:path`, so `.`, `..`, and repeated slashes fold here.
const flatten = (path: string): string => {
	const parts: string[] = [];
	for (const p of path.split("/")) {
		if (p === "..") {
			parts.pop();
		} else if (p !== "." && p !== "") {
			parts.push(p);
		}
	}
	return `/${parts.join("/")}`;
};

// `rm`, `git rm`, and the sources of `mv` name the paths a command removes.
const removals = (name: string, args: string[]): string[] => {
	if (name === "git" && args[0] === "rm") {
		return operands(args.slice(1));
	}
	const files = operands(args);
	if (name === "rm") {
		return files;
	}
	return name === "mv" ? files.slice(0, -1) : [];
};

export interface Recreation {
	seen: Set<string>;
	removed: Set<string>;
}
export const newRecreation = (): Recreation => ({
	seen: new Set(),
	removed: new Set(),
});

// The hooks module has no `process`, so a `~` is not expanded: it reads as a folder named `~`, which no call saw, so it never asks.
const resolve = (cwd: string, p: string): string =>
	flatten(p.startsWith("/") ? p : `${cwd}/${p}`);

type Exists = (path: string) => Promise<boolean>;

// A path that exists now was seen, and a removal before it no longer counts.
const note = async (
	exists: Exists,
	state: Recreation,
	path: string,
): Promise<boolean> => {
	const there = await exists(path);
	if (there) {
		state.seen.add(path);
		state.removed.delete(path);
	}
	return there;
};

const gone = async (
	exists: Exists,
	state: Recreation,
	path: string,
): Promise<boolean> =>
	state.seen.has(path) &&
	!state.removed.has(path) &&
	!(await note(exists, state, path));

const bashRecreates = async (
	exists: Exists,
	state: Recreation,
	cwd: string,
	command: string,
): Promise<Verdict | undefined> => {
	const programs = parse(command).commands.map((c) => ({
		c,
		...programOf(c),
	}));
	// Existence is read before the command runs, so an operand it creates is not "seen".
	await Promise.all(
		programs
			.flatMap(({ args }) => operands(args))
			.map((a) => note(exists, state, resolve(cwd, a))),
	);
	for (const { c, name, args } of programs) {
		const makes =
			name === "rm" || name === "sed" ? [] : writeTargets(c, name, args);
		// biome-ignore lint/performance/noAwaitInLoops: a command is judged after the removals of the commands before it
		const lost = await Promise.all(
			makes
				.filter((t) => !t.startsWith("/dev/"))
				.map((t) => gone(exists, state, resolve(cwd, t))),
		);
		if (lost.some(Boolean)) {
			return ask(GATE_RECREATE);
		}
		for (const r of removals(name, args)) {
			state.removed.add(resolve(cwd, r));
		}
	}
	return undefined;
};

const filePath = (input: unknown): string | undefined =>
	field(input, "file_path") ?? field(input, "notebook_path");

/** Records a file that a successful file-tool call read or wrote. A file tool takes an absolute path, so no folder is needed. */
export const saw = (state: Recreation, tool: string, input: unknown): void => {
	const path = filePath(input);
	if (FILE_TOOLS.has(tool) && path !== undefined) {
		state.seen.add(resolve("", path));
		state.removed.delete(resolve("", path));
	}
};

/** Asks when a call creates a file that this session saw, that is gone now, and that no call of this session removed. A Bash call also records the operands that exist, so it runs on every call. */
export const recreates = async (
	state: Recreation,
	cwdOf: () => Promise<string>,
	exists: Exists,
	tool: string,
	input: unknown,
): Promise<Verdict | undefined> => {
	const command = field(input, "command");
	if (tool === "Bash" && command !== undefined) {
		return bashRecreates(exists, state, await cwdOf(), command);
	}
	const path = filePath(input);
	return tool === "Write" &&
		path !== undefined &&
		(await gone(exists, state, resolve("", path)))
		? ask(GATE_RECREATE)
		: undefined;
};
