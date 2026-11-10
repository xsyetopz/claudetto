import { GATE_RECREATE } from "../texts-gate.ts";
import { operands, writeTargets } from "./files.ts";
import { type Command, parse, programOf } from "./shell-words.ts";
import { ask, fieldOf, type Verdict } from "./verdict.ts";

const FILE_TOOLS = new Set(["Read", "Write", "Edit", "NotebookEdit"]);

// The hooks module cannot import `node:path`, so `.`, `..`, and repeated slashes fold here.
export const flatten = (path: string): string => {
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

/** What the gate reads of the engine, built where `$` is in scope. */
export interface Host {
	cwd: () => Promise<string>;
	exists: (path: string) => Promise<boolean>;
	/** Where the path lands with every link followed, or undefined when it leads nowhere. */
	realPath: (path: string) => Promise<string | undefined>;
	list: (path: string) => Promise<{ name: string }[]>;
	home: () => Promise<string>;
	/** The tool uses of the transcript so far, each with its outcome once it has one. */
	past: () => Promise<
		{ tool: string; input: unknown; text?: string; isError?: true }[]
	>;
}

export interface Recreation {
	seen: Set<string>;
	removed: Set<string>;
	home?: string;
	replayed?: Promise<void>;
}
export const newRecreation = (): Recreation => ({
	seen: new Set(),
	removed: new Set(),
});

// Absolute, `~` expanded, then where it lands: a link in a folder of the path moves it (`/tmp` to `/private/tmp`), and a path that is gone keeps its folder's landing.
const place = async (
	host: Host,
	state: Recreation,
	cwd: string,
	p: string,
): Promise<string> => {
	if (p === "~" || p.startsWith("~/")) {
		const awaited = await host.home();
		state.home ??= awaited.trim();
		return place(host, state, cwd, `${state.home}${p.slice(1)}`);
	}
	const path = flatten(p.startsWith("/") ? p : `${cwd}/${p}`);
	const own = await host.realPath(path);
	if (own !== undefined) {
		return own;
	}
	const cut = path.lastIndexOf("/");
	const dir = await host.realPath(path.slice(0, cut + 1));
	return dir === undefined ? path : flatten(`${dir}/${path.slice(cut + 1)}`);
};

const see = (state: Recreation, path: string): void => {
	state.seen.add(path);
	state.removed.delete(path);
};

// A path that exists now was seen, and a removal before it no longer counts.
const note = async (
	host: Host,
	state: Recreation,
	path: string,
): Promise<boolean> => {
	const there = await host.exists(path);
	if (there) {
		see(state, path);
	}
	return there;
};

const gone = async (
	host: Host,
	state: Recreation,
	path: string,
): Promise<boolean> =>
	state.seen.has(path) &&
	!state.removed.has(path) &&
	!(await note(host, state, path));

// `touch` and the last operand of `ln` create what `writeTargets` leaves out.
const creates = (c: Command, name: string, args: string[]): string[] => {
	if (name === "rm") {
		return [];
	}
	const files = operands(args);
	return [
		...writeTargets(c, name, args),
		...(name === "touch" ? files : []),
		...(name === "ln" ? files.slice(-1) : []),
	];
};

/** Runs `each` on one item after another, since each call reads what the one before it recorded. */
const inOrder = async <T extends object>(
	items: readonly T[],
	each: (item: T) => Promise<void>,
	from = 0,
): Promise<void> => {
	const item = items[from];
	if (item === undefined) {
		return;
	}
	await each(item);
	await inOrder(items, each, from + 1);
};

const bashRecreates = async (
	host: Host,
	state: Recreation,
	cwd: string,
	command: string,
): Promise<Verdict | undefined> => {
	const programs = parse(command).commands.map((c) => {
		const { name, args } = programOf(c);
		return { c, name, args };
	});
	// Existence is read before the command runs, so an operand it creates is not "seen".
	await Promise.all(
		programs
			.flatMap(({ args }) => operands(args))
			.map(async (a) => note(host, state, await place(host, state, cwd, a))),
	);
	// A removal counts only once the command has run (`saw`); here it holds for the commands after it in the same text.
	const removing = new Set<string>();
	let recreated = false;
	await inOrder(programs, async ({ c, name, args }) => {
		if (recreated) {
			return;
		}
		const lost = await Promise.all(
			creates(c, name, args)
				.filter((t) => !t.startsWith("/dev/"))
				.map(async (t) => {
					const path = await place(host, state, cwd, t);
					return !removing.has(path) && (await gone(host, state, path));
				}),
		);
		if (lost.some(Boolean)) {
			recreated = true;
			return;
		}
		const removed = await Promise.all(
			removals(name, args).map((r) => place(host, state, cwd, r)),
		);
		for (const path of removed) {
			removing.add(path);
		}
	});
	return recreated ? ask(GATE_RECREATE) : undefined;
};

const filePath = (input: unknown): string | undefined =>
	fieldOf(input, "file_path") ?? fieldOf(input, "notebook_path");

// `ls` shows what its folders hold, so each entry counts as seen; a folder that is a file lists nothing.
const listed = async (
	host: Host,
	state: Recreation,
	cwd: string,
	args: string[],
): Promise<void> => {
	const folders = operands(args);
	await Promise.all(
		(folders.length > 0 ? folders : ["."]).map(async (folder) => {
			const dir = await place(host, state, cwd, folder);
			for (const { name } of await host.list(dir).catch(() => [])) {
				see(state, flatten(`${dir}/${name}`));
			}
		}),
	);
};

const afterBash = async (
	host: Host,
	state: Recreation,
	command: string,
): Promise<void> => {
	const cwd = await host.cwd();
	const work: Promise<void>[] = [];
	for (const c of parse(command).commands) {
		const { name, args } = programOf(c);
		if (name === "ls") {
			work.push(listed(host, state, cwd, args));
		}
		for (const r of removals(name, args)) {
			work.push(
				(async () => {
					const path = await place(host, state, cwd, r);
					// A failed `rm` leaves the file, so only a path that is gone was removed.
					if (!(await host.exists(path))) {
						state.removed.add(path);
					}
				})(),
			);
		}
	}
	await Promise.all(work);
};

// The main loop has no Glob or Grep, but an agent whose `tools` names them does.
const LISTERS = new Set(["Glob", "Grep"]);

/** Records what a successful call read, wrote, listed, or removed. A file tool takes an absolute path, so no folder is needed. */
export const saw = async (
	host: Host,
	state: Recreation,
	tool: string,
	input: unknown,
	text = "",
): Promise<void> => {
	const command = fieldOf(input, "command");
	const path = filePath(input);
	if (tool === "Bash" && command !== undefined) {
		await afterBash(host, state, command);
	} else if (FILE_TOOLS.has(tool) && path !== undefined) {
		see(state, await place(host, state, "", path));
	} else if (LISTERS.has(tool)) {
		// Their results print one absolute path per line, each a file that existed then.
		await Promise.all(
			text
				.split("\n")
				.filter((line) => line.startsWith("/"))
				.map(async (line) => {
					see(state, await place(host, state, "", line));
				}),
		);
	}
};

// After a `--resume` the transcript holds the calls of the earlier run; a call without a text is still in flight, and the current one is. A transcript that cannot be read leaves the state empty, as a fresh session starts. It runs before the first call is recorded, so its older calls never overwrite a newer record.
const replay = (host: Host, state: Recreation): Promise<void> => {
	state.replayed ??= (async () => {
		const calls = await host.past().catch(() => []);
		await inOrder(calls, async (t) => {
			if (t.text !== undefined && !t.isError) {
				await saw(host, state, t.tool, t.input, t.text);
			}
		});
	})();
	return state.replayed;
};

/** Asks when a call creates a file that this session saw, that is gone now, and that no call of this session removed. A Bash call also records the operands that exist, so it runs on every call. */
export const recreates = async (
	host: Host,
	state: Recreation,
	tool: string,
	input: unknown,
): Promise<Verdict | undefined> => {
	await replay(host, state);
	const command = fieldOf(input, "command");
	if (tool === "Bash" && command !== undefined) {
		return bashRecreates(host, state, await host.cwd(), command);
	}
	const path = filePath(input);
	return tool === "Write" &&
		path !== undefined &&
		(await gone(host, state, await place(host, state, "", path)))
		? ask(GATE_RECREATE)
		: undefined;
};
