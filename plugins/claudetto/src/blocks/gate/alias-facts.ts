import type { GitConfig } from "./gate.ts";
import { GIT_CONFIG_FILE_MAX_BYTES, GIT_TIMEOUT_MS } from "./limits.ts";
import type { FileStat, Run } from "./ports.ts";

export interface ConfigIo {
	run: Run;
	stat: (path: string) => Promise<FileStat>;
	read: (path: string) => Promise<string>;
}

interface HeldConfig {
	facts: GitConfig;
	files: string[];
	branch: boolean;
	/** The mtimes of `files` and the stamp of `HEAD`, both taken before the read that gave `facts`. */
	stamp: { files: string; head: string };
}
const gitConfigs = new Map<string, HeldConfig>();

const ORIGIN = /^(?:file|command line|standard input|blob):/;

const INCLUDE_PATH_WORD = /^include(?:if\.[^\n]*)?\.path\n/i;
const INCLUDE_ON_BRANCH_WORD = /^includeif\.onbranch:/i;
const GITDIR_LINE = /^gitdir:\s*(.+)$/m;

const absolute = (path: string, from: string, home: string): string => {
	let full = `${from}/${path}`;
	if (path.startsWith("~/")) {
		full = `${home}${path.slice(1)}`;
	} else if (path.startsWith("/")) {
		full = path;
	}
	const kept: string[] = [];
	for (const part of full.split("/")) {
		if (part === "..") {
			kept.pop();
		} else if (part !== "." && part !== "") {
			kept.push(part);
		}
	}
	return `/${kept.join("/")}`;
};

const configFiles = (
	lines: string[],
	cwd: string,
	home: string,
): { files: string[]; branch: boolean } => {
	const files = new Set<string>();
	let branch = false;
	let origin = cwd;
	for (const word of lines) {
		if (ORIGIN.test(word)) {
			origin = absolute(word.slice(word.indexOf(":") + 1), cwd, home);
			if (word.startsWith("file:")) {
				files.add(origin);
			}
		} else if (INCLUDE_PATH_WORD.test(word)) {
			const dir = origin.slice(0, Math.max(0, origin.lastIndexOf("/")));
			files.add(absolute(word.slice(word.indexOf("\n") + 1), dir, home));
			branch ||= INCLUDE_ON_BRANCH_WORD.test(word);
		}
	}
	return { files: [...files], branch };
};

const stampOfFile = async (
	io: ConfigIo,
	path: string,
): Promise<string | undefined> => {
	const s = await io.stat(path).catch(() => undefined);
	if (s === undefined) {
		return "none";
	}
	if (s.size > GIT_CONFIG_FILE_MAX_BYTES) {
		return undefined;
	}
	const text = await io.read(path).catch(() => "");
	return `${[s.mtimeMs, s.size, s.kind, s.isLink].join(":")}\n${text}`;
};

const stampOf = async (
	io: ConfigIo,
	files: string[],
): Promise<string | undefined> => {
	const parts = await Promise.all(files.map((path) => stampOfFile(io, path)));
	return parts.includes(undefined) ? undefined : parts.join("\0");
};

const mtimeOf = async (io: ConfigIo, path: string): Promise<string> => {
	const s = await io.stat(path).catch(() => undefined);
	return s === undefined ? "none" : String(s.mtimeMs);
};

const headStamp = async (io: ConfigIo, cwd: string): Promise<string> => {
	const dot = await io.read(`${cwd}/.git`).catch(() => "");
	const named = GITDIR_LINE.exec(dot)?.[1];
	const path = `${named ? absolute(named.trim(), cwd, "") : `${cwd}/.git`}/HEAD`;
	const [mtime, text] = await Promise.all([
		mtimeOf(io, path),
		io.read(path).catch(() => "none"),
	]);
	return `${mtime}\n${text}`;
};

const gitDirOf = async (io: ConfigIo, cwd: string): Promise<string> => {
	const out = await io
		.run(["git", "-C", cwd, "rev-parse", "--absolute-git-dir"], GIT_TIMEOUT_MS)
		.catch(() => undefined);
	const line = out?.exitCode === 0 ? out.stdout.split("\n")[0] : undefined;
	return line?.startsWith("/") ? line : `${cwd}/.git`;
};

const readGitConfig = async (
	io: ConfigIo,
	cwd: string,
	home: string,
): Promise<
	{ facts: GitConfig; files: string[]; branch: boolean } | undefined
> => {
	const run = (args: string[]) =>
		io.run(["git", "-C", cwd, ...args], GIT_TIMEOUT_MS);
	try {
		const [config, cmds] = await Promise.all([
			run([
				"config",
				"--show-origin",
				"--get-regexp",
				"-z",
				"^(alias\\.|include)",
			]),
			run(["--list-cmds=main,others"]),
		]);
		// Exit 1 means that no alias is set.
		if (![0, 1].includes(config.exitCode) || cmds.exitCode !== 0) {
			return undefined;
		}
		const aliases: Record<string, string> = {};
		const lines = config.stdout.split("\0");
		for (const entry of lines) {
			const at = entry.indexOf("\n");
			const key = at < 0 ? entry : entry.slice(0, at);
			if (key.startsWith("alias.")) {
				aliases[key.slice(6)] = at < 0 ? "" : entry.slice(at + 1);
			}
		}
		return {
			facts: { aliases, commands: cmds.stdout.split("\n").filter(Boolean) },
			...configFiles(lines, cwd, home),
		};
	} catch {
		return undefined;
	}
};

const commonDirOf = async (io: ConfigIo, gitDir: string): Promise<string> => {
	const named = await io.read(`${gitDir}/commondir`).catch(() => "");
	return named.trim() ? absolute(named.trim(), gitDir, "") : gitDir;
};

const baseFiles = (
	home: string,
	xdg: string | undefined,
	gitDir: string,
	common: string,
): string[] => [
	`${home}/.gitconfig`,
	`${common}/config`,
	"/etc/gitconfig",
	`${xdg || `${home}/.config`}/git/config`,
	`${gitDir}/config.worktree`,
];

const readUntilStable = async (
	io: ConfigIo,
	cwd: string,
	home: string,
	files: string[],
	withHead: boolean,
): Promise<GitConfig | undefined> => {
	const stamped = await stampOf(io, files);
	const head = withHead ? await headStamp(io, cwd) : "";
	const read = stamped && (await readGitConfig(io, cwd, home));
	if (!read) {
		gitConfigs.delete(cwd);
		return undefined;
	}
	const fresh = read.files.filter((path) => !files.includes(path));
	if (fresh.length === 0 && (withHead || !read.branch)) {
		gitConfigs.set(cwd, {
			facts: read.facts,
			files,
			branch: read.branch,
			stamp: { files: stamped, head },
		});
		return read.facts;
	}
	return readUntilStable(
		io,
		cwd,
		home,
		[...files, ...fresh],
		withHead || read.branch,
	);
};

export const gitConfigOf = async (
	io: ConfigIo,
	cwd: string,
	home: string,
	xdg: string | undefined,
): Promise<GitConfig | undefined> => {
	const held = gitConfigs.get(cwd);
	if (
		held &&
		(await stampOf(io, held.files)) === held.stamp.files &&
		(!held.branch || (await headStamp(io, cwd)) === held.stamp.head)
	) {
		return held.facts;
	}
	const gitDir = await gitDirOf(io, cwd);
	return readUntilStable(
		io,
		cwd,
		home,
		[
			...new Set([
				...baseFiles(home, xdg, gitDir, await commonDirOf(io, gitDir)),
				...(held?.files ?? []),
			]),
		],
		// `HEAD` is in the stamp only for a config with an `includeIf` on a branch.
		held?.branch ?? false,
	);
};
