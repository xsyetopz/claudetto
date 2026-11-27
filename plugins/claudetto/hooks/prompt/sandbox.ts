/**
 * Shortens the engine's sandbox instructions, which every session sends on its
 * first request and writes to the prompt cache (about 9,800 characters on
 * claude 2.1.329, most of it one JSON line of full paths). Two steps:
 *
 * - The `Filesystem:` and `Network:` lines become one line per list, with the
 *   home folder as `~`, the working folder as `.`, `/private/tmp` and
 *   `/private/var` as their `/tmp` and `/var` links, duplicates dropped, and
 *   names that share a folder written once as `folder/{a,b}`.
 * - Each paragraph or bullet whose text is exactly the 2.1.329 wording is
 *   replaced by a shorter one with the same rule. Wording this table does not
 *   know (another platform, a later build) passes through unchanged, so a
 *   rule is never lost to a rewrite written for different text.
 */

import type { On } from "claude-code";

import { fault } from "../shared/fault";

/** FNV-1a over UTF-16 code units: a short stable key for one exact block. */
const keyOf = (text: string): string => {
	// The 32-bit FNV offset basis and prime, 0x811C9DC5 and 0x01000193.
	let h = 2_166_136_261;
	for (let i = 0; i < text.length; i++) {
		h ^= text.codePointAt(i) ?? 0;
		h = Math.imul(h, 16_777_619) >>> 0;
	}
	return h.toString(36);
};

/**
 * The 2.1.329 blocks, by the key of their exact text, and the shorter text that
 * keeps each rule. A block is one paragraph line, or one top-level bullet with
 * its sub-bullets.
 */
export const SHORT: Readonly<Record<string, string>> = {
	// By default, Bash commands run inside an OS-level sandbox (macOS Seatbelt) ...
	"1xdi0w3":
		"The OS sandbox (macOS Seatbelt) wraps each `Bash` command separately, not the session; its setup is below.",
	// The sandbox marks out what this session was given: ...
	"1jw2rhp":
		"Your boundary is what the task was given: the paths below, the task's hosts, the credentials the user supplied, even where a limit is unenforced. Reachable keys, other projects and config, machine-control sockets and cloud metadata stay the user's unless the request calls for them. If the given means cannot finish the task, do what you can and say plainly what is missing; that is a complete answer.",
	// How the sandbox is configured in this session:
	ipsyg2: "Setup (`~` = `$HOME`, `.` = cwd, `a/{b,c}` = `a/b`, `a/c`):",
	// You should always default to running commands within the sandbox. ...
	"4tvy7k":
		" - Run in the sandbox by default. Set `dangerouslyDisableSandbox: true` only when the user explicitly asks, or when a command just failed with sandbox evidence; commands also fail for other reasons (missing files, wrong arguments, the network).",
	// Evidence of sandbox-caused failures includes: ...
	oxl1dz:
		' - Sandbox evidence: "Operation not permitted", access denied outside the allowed paths, a refused host, a Unix socket error.',
	// When you see evidence of sandbox-caused failure: ...
	"4atp0n":
		" - On that evidence, put a host named in `<sandbox_violations>` in the re-run's `allowed_domains` (auto mode); otherwise retry with `dangerouslyDisableSandbox: true` at once (the retry passes the permission gate, so a prose question adds nothing). Name the likely restriction briefly and say `/sandbox` manages restrictions.",
	// A sandbox denial on a credential, a file or a host that the task does not involve ...
	psl3dd:
		" - A denial on a credential, file or host the task does not involve is the boundary at work: tell the user and keep the command sandboxed.",
	// Treat each command you execute with `dangerouslyDisableSandbox: true` individually. ...
	"1esqgpu":
		" - Each unsandboxed command stands alone; the next one defaults to the sandbox again.",
	// Do not suggest adding sensitive paths like ~/.bashrc, ...
	"1fef5ry":
		" - Keep sensitive paths (`~/.bashrc`, `~/.zshrc`, `~/.ssh/*`, credential files) off every allowlist you suggest.",
	// Network egress goes through a filtering proxy. ...
	rvagvw:
		" - Egress passes a filtering proxy: try the request and read the error; a denial comes in a `<sandbox_violations>` block. In auto mode, list each extra host a command needs in its `allowed_domains`; a denied host goes there on the re-run.",
	// Opening an app, file or URL with `open`, or scripting another app with `osascript`, ...
	"1n070x5":
		' - `open` and `osascript` are blocked here (-10822, -54, -600, "LSOpenURLsWithRole() failed"). That is the sandbox, not your build: tell the user and give the exact command for them to run.',
	// On macOS, a sandboxed command can look into and signal only the processes ...
	n49nda:
		" - A sandboxed command sees and signals only processes it started: an empty `lsof -i :3000` does not show a free port, `lsof -ti:3000 | xargs kill` can stop nothing and exit 0, `psutil` gets `AccessDenied`. To find or stop another process, retry as for a sandbox failure, and say in that message that the sandbox hides processes and the retry runs without its protection.",
	// For temporary files, always use the `$TMPDIR` environment variable. ...
	"1uuu8v3":
		" - Temporary files go under `$TMPDIR` (set, sandbox-writable) in place of `/tmp`.",
	// The repository's `.git/worktrees` is read-only in the sandbox, ...
	fkw9fy:
		" - `.git/worktrees` is read-only here except this session's worktrees: `git worktree add`, `move` and `remove`, and renaming a branch another worktree has checked out, fail halfway inside; run them outside the sandbox.",
	// If a clipboard utility such as `pbcopy`, `xclip`, or `wl-copy` fails ...
	jumeqb:
		" - If `pbcopy`, `xclip` or `wl-copy` fails and the user wants the text copied, put it in a fenced block and tell them to run `/copy` (it copies from outside the sandbox) in place of a file to copy by hand."
};

/** The places a path is written shorter: the folder prefixes and their short names. */
export interface Places {
	readonly home: string;
	readonly cwd: string;
}

/** One path as the short config line writes it. */
const shortPath = (path: string, at: Places): string => {
	const p = path.replace(/^\/private\/(tmp|var)(?=\/|$)/u, "/$1");
	const under = (root: string, as: string): string | undefined => {
		if (root === "" || root === "/") {
			return undefined;
		}
		if (p === root) {
			return as;
		}
		return p.startsWith(`${root}/`)
			? `${as}${p.slice(root.length)}`
			: undefined;
	};
	return under(at.cwd, ".") ?? under(at.home, "~") ?? p;
};

const TRUNCATED = /^\.\.\. and (\d+) more \(truncated for prompt size\)$/u;

/** A path list in one line: short paths, no duplicates, shared folders written once. */
export const shortList = (paths: readonly string[], at: Places): string => {
	const groups = new Map<string, string[]>();
	const tail: string[] = [];
	for (const raw of paths) {
		const more = TRUNCATED.exec(raw);
		if (more !== null) {
			tail.push(`+${more[1]} more`);
			continue;
		}
		const path = shortPath(raw, at);
		const cut = path.lastIndexOf("/");
		const folder =
			cut > 0 && !path.slice(cut + 1).includes("*") ? path.slice(0, cut) : path;
		const name = folder === path ? "" : path.slice(cut + 1);
		const names = groups.get(folder) ?? [];
		if (!names.includes(name)) {
			names.push(name);
		}
		groups.set(folder, names);
	}
	const out: string[] = [];
	for (const [folder, names] of groups) {
		const named = names.filter((n) => n !== "");
		if (named.length < names.length) {
			out.push(folder);
		}
		if (named.length === 1) {
			out.push(`${folder}/${named[0] ?? ""}`);
		} else if (named.length > 1) {
			out.push(`${folder}/{${named.join(",")}}`);
		}
	}
	return [...out, ...tail].join(", ");
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * A config line (`Filesystem: {json}`) as one line per list, or `undefined` when
 * its value is not the JSON object shape the engine writes.
 */
export const shortConfig = (line: string, at: Places): string | undefined => {
	const found = /^(\w+): (\{.*\})$/u.exec(line);
	if (found === null) {
		return undefined;
	}
	let value: unknown;
	try {
		value = JSON.parse(found[2] ?? "");
	} catch {
		return undefined;
	}
	if (!isRecord(value)) {
		return undefined;
	}
	const rows: string[] = [];
	const walk = (path: string, v: unknown): boolean => {
		if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
			rows.push(`${path}: ${shortList(v, at)}`);
			return true;
		}
		if (isRecord(v)) {
			return Object.entries(v).every(([k, x]) =>
				walk(path === "" ? k : `${path}.${k}`, x)
			);
		}
		if (
			typeof v === "string" ||
			typeof v === "number" ||
			typeof v === "boolean"
		) {
			rows.push(`${path}: ${String(v)}`);
			return true;
		}
		return false;
	};
	return walk("", value) ? `${found[1]} ${rows.join("; ")}` : undefined;
};

/** Splits the text into blocks: a top-level bullet holds its sub-bullets. */
const blocksOf = (text: string): string[] => {
	const out: string[] = [];
	for (const line of text.split("\n")) {
		const last = out.length - 1;
		if (
			line.startsWith("  - ") &&
			last >= 0 &&
			out[last]?.startsWith(" - ") === true
		) {
			out[last] = `${out[last]}\n${line}`;
		} else {
			out.push(line);
		}
	}
	return out;
};

/** The sandbox instructions, shortened as the module comment describes. */
export const shortSandbox = (text: string, at: Places): string =>
	blocksOf(text)
		.map((block) => SHORT[keyOf(block)] ?? shortConfig(block, at) ?? block)
		.join("\n");

/** Shortens the engine's `sandbox_instructions` attachment; any fault sends it unchanged. */
export function registerSandbox(on: On): void {
	on("prompt.attachment", async ($, e, next) => {
		if (e.type !== "sandbox_instructions") {
			return next(e);
		}
		const home = (await $.env.get("HOME")) ?? "";
		const cwd = await $.session.cwd();
		return next({ ...e, text: shortSandbox(e.text, { home, cwd }) });
	}).catch(($, e, next) => {
		fault($, "sandbox instructions", next.error);
		return next(e);
	});
}

/** The key of one block, for tests that pin the table to the engine's text. */
export const blockKey = keyOf;
