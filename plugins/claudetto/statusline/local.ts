import { open, readdir, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";

import { lineFilePath } from "../hooks/limits/heartbeat.ts";
import { num, parse, str } from "./input.ts";

/** One OpenSpec change folder and the boxes of its `tasks.md`. */
export interface Change {
	name: string;
	done: number;
	total: number;
	mtimeMs: number;
}

/** What the line reads from the project folder. Every read is optional: a part that cannot be read is left out. */
export interface Local {
	branch?: string;
	changes: readonly Change[];
	/** Whether claudetto's hooks stopped while the session went on, read by `hooksOff`. */
	hooksOff?: boolean;
	/** The window compaction runs against, from the line file, read by `readLine`. */
	window?: number;
	/** The Claude Code theme name, from the line file, read by `readLine`. */
	theme?: string;
}

/** The file calls of the reader, so a test can record each path. */
export interface Files {
	/** The first `cap` bytes of the file at `path`, or `undefined` when it is missing, a folder, or unreadable. */
	read: (path: string, cap: number) => Promise<string | undefined>;
	/** The folder names in `path`, or `[]`. */
	folders: (path: string) => Promise<string[]>;
	/** The modified time of `path` in milliseconds, or `0`. */
	mtime: (path: string) => Promise<number>;
}

export const NO_LOCAL: Local = { changes: [] };

/** The caps on each read, on the walk to the repository root, and on the changes listed; choices that bound the work per refresh. */
const HEAD_CAP = 4096;
const LINE_CAP = 1024;
const TASKS_CAP = 256 * 1024;
const MAX_PARENTS = 32;
const MAX_CHANGES = 32;

const REF_PREFIX = "ref: refs/heads/";
const HASH = /^[0-9a-f]{40,64}$/u;
const GITDIR = /^gitdir:\s*(.+)$/mu;
/** The task line pattern of OpenSpec's `dist/utils/task-progress.js`, so the counts match `openspec list`. */
const TASK_LINE =
	/^\s*(?:[-*+]|\d{1,9}[.)])\s*\[(?:\s*([^\]\s]?)\s*\](?![([])|\s+\])\s*(.*)/u;

const readCapped = async (path: string, cap: number): Promise<string> => {
	await using handle = await open(path, "r");
	const buffer = Buffer.alloc(cap);
	const { bytesRead } = await handle.read(buffer, 0, cap, 0);
	return buffer.toString("utf8", 0, bytesRead);
};

export const NODE_FILES: Files = {
	read: async (path, cap) => {
		let text: string | undefined;
		try {
			text = await readCapped(path, cap);
		} catch {
			text = undefined;
		}
		return text;
	},
	folders: async (path) => {
		try {
			const awaited = await readdir(path, { withFileTypes: true });
			return awaited
				.filter((entry) => entry.isDirectory())
				.map((entry) => entry.name);
		} catch {
			return [];
		}
	},
	mtime: async (path) => {
		try {
			const awaited2 = await stat(path);
			return awaited2.mtimeMs;
		} catch {
			return 0;
		}
	},
};

const branchOfHead = (head: string): string | undefined => {
	const text = head.trim();
	if (text.startsWith(REF_PREFIX)) {
		return text.slice(REF_PREFIX.length) || undefined;
	}
	return HASH.test(text) ? text.slice(0, 7) : undefined;
};

/** The `HEAD` text of the repository holding `dir`: `.git/HEAD` of a checkout, or the `HEAD` a `.git` file's `gitdir:` line names. */
const headOf = async (
	dir: string,
	files: Files,
	parents = MAX_PARENTS,
): Promise<string | undefined> => {
	const head = await files.read(join(dir, ".git", "HEAD"), HEAD_CAP);
	if (head !== undefined) {
		return head;
	}
	const awaited3 = await files.read(join(dir, ".git"), HEAD_CAP);
	const target = awaited3?.match(GITDIR)?.[1]?.trim();
	if (target !== undefined && target !== "") {
		const gitDir = isAbsolute(target) ? target : resolve(dir, target);
		return files.read(join(gitDir, "HEAD"), HEAD_CAP);
	}
	const parent = dirname(dir);
	return parent === dir || parents === 0
		? undefined
		: headOf(parent, files, parents - 1);
};

const countBoxes = (text: string): { done: number; total: number } => {
	let done = 0;
	let total = 0;
	for (const line of text.split("\n")) {
		const match = TASK_LINE.exec(line);
		if (match) {
			total += 1;
			done += (match[1] ?? "").toLowerCase() === "x" ? 1 : 0;
		}
	}
	return { done, total };
};

const changesOf = async (dir: string, files: Files): Promise<Change[]> => {
	const root = join(dir, "openspec", "changes");
	const awaited4 = await files.folders(root);
	const names = awaited4
		.filter((name) => name !== "archive")
		.toSorted((a, b) => a.localeCompare(b))
		.slice(0, MAX_CHANGES);
	const found = await Promise.all(
		names.map(async (name) => {
			const path = join(root, name, "tasks.md");
			const text = await files.read(path, TASKS_CAP);
			return text === undefined
				? []
				: [{ name, ...countBoxes(text), mtimeMs: await files.mtime(path) }];
		}),
	);
	return found.flat();
};

/** The window and the theme the claudetto mod wrote for `session` under `dir` after its last turn. */
export const readLine = async (
	dir: string,
	session: string | undefined,
	files: Files = NODE_FILES,
): Promise<Pick<Local, "window" | "theme">> => {
	const text =
		session === undefined
			? undefined
			: await files.read(join(dir, lineFilePath(session)), LINE_CAP);
	const line = text === undefined ? undefined : parse(text);
	const window = num(line?.["window"]);
	const theme = str(line?.["theme"]);
	return {
		...(window !== undefined && window > 0 ? { window } : {}),
		...(theme === undefined ? {} : { theme }),
	};
};

/** The branch and the OpenSpec changes of the project folder `dir`, read with capped file reads and no child process. */
export const readLocal = async (
	dir: string,
	files: Files = NODE_FILES,
): Promise<Local> => {
	const [head, changes] = await Promise.all([
		headOf(resolve(dir), files),
		changesOf(dir, files),
	]);
	const branch = head === undefined ? undefined : branchOfHead(head);
	return branch === undefined ? { changes } : { branch, changes };
};
