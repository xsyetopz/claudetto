// The protected files that a `Bash` call may not change, and the test of a change (task 19.12 of change `redesign-0-4-0`).
// The test reads the effect on the file, so a write by `python3`, `perl`, `sed`, or a rename counts the same.

import { ticked } from "../../finish/domain/tasks.ts";
import { isPlanFile } from "../../ground/domain/plan.ts";
import { PROTECTED_FILES, STAMP_IGNORED } from "../limits.ts";

const TASKS_FILE = /(?:^|\/)tasks\.md$/;
const FETCH_LINE = /^(\S+)\t(\S+) \(fetch\)$/;
const NETWORK_URL = /^(?:https?|ssh|git):\/\/[^/\s]/;
const SSH_SCHEME_URL = /^ssh:\/\/[^/\s]/;
const USER_AT_HOST = /^[\w.-]+@[\w.-]+:/;
const REMOTE_REF = /^refs\/remotes\/([^/]+)\/(.+)$/;
const SSH_OPAQUE =
	/^\s*(?:include\b|match\b.*\bexec\b|(?:proxycommand|proxyjump|localcommand|knownhostscommand|controlpath)\b(?!\s*=?\s*none\s*$))/im;
const PLAIN_SSH = /^ssh(?: (?:-[46vq]|-i [\w./~-]+|-p \d+))*$/;

/** `tasks`: only a box that is checked counts. `whole`: any change counts. */
export type Kind = "tasks" | "whole";

/** The kind of the protected file at `rel`, a path from the project root, or `undefined` for a file that is not protected. */
export const kindOf = (rel: string): Kind | undefined => {
	if (PROTECTED_FILES.includes(rel)) {
		return "whole";
	}
	if (!isPlanFile(rel)) {
		return undefined;
	}
	return TASKS_FILE.test(rel) ? "tasks" : "whole";
};

/** True when the file went from `before` to `after` (`undefined` for a file that is absent) in a way that its kind forbids. */
export const changed = (
	kind: Kind,
	before: string | undefined,
	after: string | undefined,
): boolean =>
	kind === "tasks"
		? ticked(before ?? "", after ?? "").length > 0
		: before !== after;

/** `path` from the root `root`, or `undefined` for a path outside it. */
export const relative = (root: string, path: string): string | undefined =>
	path.startsWith(`${root}/`) ? path.slice(root.length + 1) : undefined;

/** The field `key` of `value`, or `undefined` when `value` is no object or has no such field. */
const prop = (value: unknown, key: string): unknown =>
	typeof value === "object" && value !== null
		? Object.entries(value).find(([k]) => k === key)?.[1]
		: undefined;

/**
 * The changed files that the field `bashEditDiff` of `tool_response` lists, or `undefined` when the field cannot be used:
 * it is missing, it has `unavailable` or `skipped`, or it lists more files than it names (`moreFiles`).
 */
export const diffPaths = (response: unknown): string[] | undefined => {
	const field = prop(response, "bashEditDiff");
	if (field === null || typeof field !== "object") {
		return undefined;
	}
	if (prop(field, "unavailable") || prop(field, "skipped")) {
		return undefined;
	}
	const moreFiles = prop(field, "moreFiles");
	if (typeof moreFiles === "number" && moreFiles > 0) {
		return undefined;
	}
	const files = prop(field, "changedFiles");
	return Array.isArray(files)
		? files.filter((f): f is string => typeof f === "string")
		: undefined;
};

/** The files before one call: the project path of each, where it really is, and its text. */
export interface Saved {
	[path: string]: { real: string; text: string };
}

/** What git had before a call: the commits that a ref, `HEAD`, or the stash pointed to, where each remote-tracking ref pointed, the fetch URL of each remote, and the stamp of what `git ls-remote` reads. */
export interface Known {
	commits: string[];
	remotes: { [ref: string]: string };
	urls: { [remote: string]: string };
	/** The blob id of the text that `git ls-remote` reads, by source: `config` (the output of `git config --list --show-origin --show-scope` without the keys of `STAMP_IGNORED`, which holds each config file and include), `ssh` (`~/.ssh/config`), `env`, and `bin` (the real paths of `ssh` and `git`). `undefined` when a source could not be read. */
	stamps?: { [source: string]: string };
	/** The transports (`Transport`) whose remote cannot be trusted, as `git ls-remote` runs a program or reads a file there that the code cannot read: `ssh` for a program that `ssh` runs, `git` for a program of `core.gitProxy`, and `all` for a `git` that a call can rewrite. Empty when nothing blocks. `undefined` is the same as `["all"]` (the settings could not be read). */
	opaque?: string[];
	/** The real path of `git` at the pin: later runs use this path, and a `git` that `PATH` names now but is another file makes the pin not trusted. */
	git?: string;
	/** Set only when git gave no commits at the first call: `false` until the model got the line that says so, then `true`. */
	told?: boolean;
}

/** The fetch URL of each remote in the output of `git remote -v` (a line `name<TAB>url (fetch)`), by remote name. The first URL of a remote counts. */
export const parseUrls = (out: string): { [remote: string]: string } => {
	const urls: { [remote: string]: string } = {};
	for (const line of out.split("\n")) {
		const m = FETCH_LINE.exec(line.trim());
		if (m?.[1] && m[2] && !(m[1] in urls)) {
			urls[m[1]] = m[2];
		}
	}
	return urls;
};

/** True when `url` names a server on the network: a scheme `http`, `https`, `ssh`, or `git`, or the form `user@host:path`. A path, a `file:` URL, or a helper (`ext::`) is a place that a call can write, so it proves nothing. */
export const networkUrl = (url: string): boolean =>
	NETWORK_URL.test(url) || USER_AT_HOST.test(url);

/** The `sha ref` lines of `git for-each-ref --format='%(objectname) %(refname)'`, as pairs. */
export const parseRefs = (out: string): [string, string][] =>
	out.split("\n").flatMap((line): [string, string][] => {
		const [sha, ref] = line.trim().split(" ");
		return sha && ref ? [[sha, ref]] : [];
	});

/** The remote-tracking refs `now`, as `[sha, ref]`, that moved since `known`. */
export const movedRemotes = (
	known: Known,
	now: [string, string][],
): [string, string][] =>
	now.filter(
		([sha, ref]) =>
			ref.startsWith("refs/remotes/") && known.remotes[ref] !== sha,
	);

/** The remote and the branch ref on it for `refs/remotes/<remote>/<branch>`, or `undefined` for another ref. */
export const remoteOf = (ref: string): [string, string] | undefined => {
	const m = REMOTE_REF.exec(ref);
	return m?.[1] && m[2] ? [m[1], `refs/heads/${m[2]}`] : undefined;
};

/** True when `url` goes over `ssh`: the scheme `ssh`, or the form `user@host:path`. */
export const sshUrl = (url: string): boolean =>
	SSH_SCHEME_URL.test(url) || USER_AT_HOST.test(url);

/** The transport of a network `url`: `ssh`, `git` (the `git` protocol), or `http` (`http` and `https`). */
export type Transport = "ssh" | "git" | "http";

export const transportOf = (url: string): Transport => {
	if (sshUrl(url)) {
		return "ssh";
	}
	return url.startsWith("git://") ? "git" : "http";
};

/** True when the text of `~/.ssh/config` has a line that makes `ssh` read another file or run a program or reach a socket that the code does not read: `Include`, `Match` with `exec`, or `ProxyCommand`, `ProxyJump`, `LocalCommand`, `KnownHostsCommand`, or `ControlPath` with a value other than `none`. */
export const sshOpaque = (text: string): boolean => SSH_OPAQUE.test(text);

/** `config`, the output of `git config --list --show-origin --show-scope`, without the lines of the keys in `STAMP_IGNORED`, which `git ls-remote` never reads. A line with no key is kept. */
export const readConfig = (config: string): string =>
	config
		.split("\n")
		.filter((line) => {
			const key = line.split("\t")[2]?.toLowerCase() ?? "";
			return !STAMP_IGNORED.some((prefix) => key.startsWith(prefix));
		})
		.join("\n");

/** The values of the config key `key` (in lower case) in `config`, in the form of the output of `git config --list --show-origin --show-scope`. */
export const valuesOf = (config: string, key: string): string[] =>
	config.split("\n").flatMap((line) => {
		const [, , ...rest] = line.split("\t");
		const entry = rest.join("\t");
		const at = entry.indexOf("=");
		return at > 0 && entry.slice(0, at).toLowerCase() === key
			? [entry.slice(at + 1)]
			: [];
	});

/** True when the command `value` of `core.sshCommand`, `GIT_SSH_COMMAND`, or `GIT_SSH` is the program `ssh` of `PATH` with only the options `-4`, `-6`, `-v`, `-q`, `-i <file>`, and `-p <port>`: it names no other program and no other config file. */
const plainSsh = (value: string): boolean => PLAIN_SSH.test(value.trim());

/** True when `path` is a file that a call can write: a path that is not absolute, or one below a folder of `roots` (the home folder and the project). */
export const writable = (path: string, roots: string[]): boolean =>
	path !== "" &&
	(!path.startsWith("/") ||
		roots.some((root) => root !== "" && path.startsWith(`${root}/`)));

/** What blocks the trust of a remote at the pin (see `Known.opaque`): a program that `ssh` or `git` runs and that the code cannot read, or a program that a call can rewrite. `paths` are the real paths of `ssh` and `git`, and `env` the values of the env vars (empty when not set). The program `ssh` of `PATH` is not a block, as the stamp of its path covers it. */
export const opaqueOf = (v: {
	config: string;
	ssh: string;
	env: { [name: string]: string };
	paths: { ssh: string; git: string };
	roots: string[];
}): string[] => {
	const blocks: string[] = [];
	const commands = [
		...valuesOf(v.config, "core.sshcommand"),
		v.env["GIT_SSH"] ?? "",
		v.env["GIT_SSH_COMMAND"] ?? "",
	].filter((command) => command !== "");
	if (
		sshOpaque(v.ssh) ||
		commands.some((command) => !plainSsh(command)) ||
		writable(v.paths.ssh, v.roots)
	) {
		blocks.push("ssh");
	}
	if (
		valuesOf(v.config, "core.gitproxy").some((proxy) => proxy !== "") ||
		(v.env["GIT_PROXY_COMMAND"] ?? "") !== ""
	) {
		blocks.push("git");
	}
	if (writable(v.paths.git, v.roots)) {
		blocks.push("all");
	}
	return blocks;
};

/** The sources whose id in `now` differs from the id in `before`. */
export const changedStamps = (
	before: { [source: string]: string },
	now: { [source: string]: string },
): string[] =>
	[...new Set([...Object.keys(before), ...Object.keys(now)])].filter(
		(source) => before[source] !== now[source],
	);
