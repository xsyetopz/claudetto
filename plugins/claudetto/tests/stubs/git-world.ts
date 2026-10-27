// The world of the `protect` lab tests: the files, the config, and the fake `git`, `ssh`, and `rm` runs.

import { ran } from "./process.ts";

export interface World {
	files: Record<string, string>;
	/** The argv of each process run. */
	runs: string[][];
	/** The stdout of each `git` run by its args after `-C /p` joined with a space. A run with no entry fails, as in a folder that is no git repo. */
	git: Record<string, string>;
	/** The `tasks.md` text of each commit, by sha: what `git cat-file --batch-check` finds with `<sha>:<path>`. */
	blobs: Record<string, string>;
	/** The replacement of a commit by sha, as `git replace` makes it: `cat-file` follows it unless the call has `--no-replace-objects`. */
	replaced: Record<string, string>;
	/** The stdin of each `git cat-file` run. */
	lookups: string[];
	/** True when `fs.write` is refused, as on a read-only disk. */
	readOnly: boolean;
	/** The variables set with `env.set`. */
	env: Record<string, string>;
	/** The sha of each branch ref on the server at a URL: what `git ls-remote <url> <ref>` finds. A URL with no entry fails. An `ssh` URL is looked up as `via:<command>` when `core.sshCommand`, `GIT_SSH_COMMAND`, or a `ProxyCommand` of `~/.ssh/config` sets a command, as that command picks the server. */
	servers: Record<string, Record<string, string>>;
	/** The file that `command -v` finds for `ssh` and `git`. */
	bin: { ssh: string; git: string };
	/** The `git` file that a call wrote: a run is fake when the file it runs is this one. The name `git` runs `bin.git`, as `PATH` resolves it, and an absolute path runs that file. A run of any other file is the real `git`. The fake prints one blob id for each `hash-object` and `cat-file` run. */
	fakeGit: string | undefined;
	/** How `/bin/rm` ends: `ok`, `fail` (exit code 1), or `reject` (the run rejects, as with no `/bin/rm`). */
	rm: "ok" | "fail" | "reject";
	/** The state, with versions as the engine keeps it. */
	store: Map<string, { value: unknown; version: number }>;
	/** Runs once before the next `state.set` of the pin, and stands for a write of another call that lands between the read and the write. */
	beforeSet: (() => void) | undefined;
}

/** The blob id of a text in the stub: the encoded text behind a prefix, with no space. */
export const blobId = (text: string) => `blob-${encodeURIComponent(text)}`;

export const BIN = { ssh: "/usr/bin/ssh", git: "/usr/bin/git" };

export const PROJECT_HEAD = /^\/p/;
export const INSTEAD_OF_KEY = /^url\..*\.insteadof$/;
export const SSH_SCHEME = /^ssh:\/\//;
export const SSH_SCP_LIKE = /^[\w.-]+@[\w.-]+:/;
export const SSH_CONFIG_COMMAND =
	/(?:ProxyCommand|ProxyJump|LocalCommand|KnownHostsCommand) (.+)/;
export const PLAIN_SSH = /^ssh\b/;
export const REMOTE_URL_KEY = /^remote\.(.+)\.url$/;
export const GIT_SCHEME = /^git:\/\//;

export const real = (path: string) => path.replace(PROJECT_HEAD, "/private/p");

export const LOCAL = "/p/.git/config";
export const GLOBAL = "/home/u/.gitconfig";
export const SSH_CONFIG = "/home/u/.ssh/config";

/** The config files in the order that `git` reads them, with a `key=value` line for each entry. */
export const entriesOf = (world: World) =>
	[GLOBAL, LOCAL].flatMap((path) =>
		(world.files[path] ?? "")
			.split("\n")
			.filter((l) => l.includes("="))
			.map((l) => ({
				path,
				key: l.slice(0, l.indexOf("=")),
				value: l.slice(l.indexOf("=") + 1),
			})),
	);

/** Sets `key` to `value` in the config file `path`. */
export const setConfig = (
	world: World,
	path: string,
	key: string,
	value: string,
) => {
	const kept = (world.files[path] ?? "")
		.split("\n")
		.filter((l) => l !== "" && !l.startsWith(`${key}=`));
	world.files[path] = `${[...kept, `${key}=${value}`].join("\n")}\n`;
};

/** Sets the URL of the remote `name` in the local config. */
export const setUrl = (world: World, name: string, url: string) => {
	setConfig(world, LOCAL, `remote.${name}.url`, url);
};

/** The config value of `key` now: the last entry wins. */
export const configOf = (world: World, key: string) =>
	entriesOf(world)
		.filter((e) => e.key === key)
		.at(-1)?.value;

/** `url` after `url.<base>.insteadof`, as `git` does it: the longest matching prefix, one time. */
export const rewrite = (world: World, url: string) => {
	const rule = entriesOf(world)
		.filter((e) => INSTEAD_OF_KEY.test(e.key) && url.startsWith(e.value))
		.sort((a, b) => b.value.length - a.value.length)[0];
	return rule
		? rule.key.slice(4, -".insteadof".length) + url.slice(rule.value.length)
		: url;
};

export const sshLike = (url: string) =>
	SSH_SCHEME.test(url) || SSH_SCP_LIKE.test(url);

/** The command that picks the server for an `ssh` URL, or `undefined` for the plain server. */
export const sshVia = (world: World) => {
	const command =
		configOf(world, "core.sshcommand") ??
		world.env["GIT_SSH_COMMAND"] ??
		world.env["GIT_SSH"] ??
		SSH_CONFIG_COMMAND.exec(world.files[SSH_CONFIG] ?? "")?.[1];
	return command === undefined || PLAIN_SSH.test(command) ? undefined : command;
};

/** The `git` stdout for the config: `git config --list --show-origin --show-scope`. */
export const configList = (world: World) =>
	entriesOf(world)
		.map(
			(e) =>
				`${e.path === GLOBAL ? "global" : "local"}\tfile:${e.path}\t${e.key}=${e.value}`,
		)
		.join("\n");

/** `git remote -v`: the URLs of the config files after `insteadOf`. */
export const remoteList = (world: World) =>
	ran(
		entriesOf(world)
			.flatMap((e) => {
				const name = REMOTE_URL_KEY.exec(e.key)?.[1];
				const url = rewrite(world, e.value);
				return name
					? [`${name}\t${url} (fetch)`, `${name}\t${url} (push)`]
					: [];
			})
			.join("\n"),
	);

/** `git ls-remote <url> <ref>`: it takes a URL only, so a remote name fails. */
export const lsRemote = (world: World, args: readonly string[]) => {
	const [, urlArg = "", ref = ""] = args;
	const url = rewrite(world, urlArg);
	const fake = [
		world.bin.git === BIN.git ? undefined : world.bin.git,
		sshLike(url) && world.bin.ssh !== BIN.ssh ? world.bin.ssh : undefined,
	].find((path) => path !== undefined);
	const via = serverVia(world, url, fake);
	const refs = world.servers[via === undefined ? url : `via:${via}`];
	const sha = refs?.[ref];
	return refs === undefined ? ran("", 128) : ran(sha ? `${sha}\t${ref}\n` : "");
};

/** What picks the server of `url`: the fake program `fake`, the `ssh` command, or the proxy of a `git` URL. */
export const serverVia = (
	world: World,
	url: string,
	fake: string | undefined,
): string | undefined => {
	if (fake !== undefined) {
		return `bin:${fake}`;
	}
	if (sshLike(url)) {
		return sshVia(world);
	}
	return GIT_SCHEME.test(url) ? configOf(world, "core.gitproxy") : undefined;
};

/** The answer of a stubbed `git` run: `hash-object --stdin` gives the blob id of the stdin and fails for any other args, so a filter flag or a `--path` is caught, `ls-remote` asks the server at a URL after `url.<base>.insteadOf` and fails for a remote name, `remote -v` prints the URLs of the config files after `insteadOf`, `config --list` prints these files, `cat-file --batch-check` looks up `<sha>:<path>` lines in `blobs` (a commit in `replaced` gives the blob of its replacement, unless the argv has `--no-replace-objects`), and the rest is read from `git`. */
export const gitRun = (world: World, argv: readonly string[], stdin = "") => {
	const flagged = argv[1] === "--no-replace-objects";
	const args = argv.slice(flagged ? 4 : 3);
	if (args[0] === "hash-object") {
		return args.join(" ") === "hash-object --stdin"
			? ran(`${blobId(stdin)}\n`)
			: ran("", 128);
	}
	if (args[0] === "remote" && args[1] === "-v") {
		return remoteList(world);
	}
	if (args.join(" ") === "config --list --show-origin --show-scope") {
		return ran(configList(world));
	}
	if (args[0] === "ls-remote") {
		return lsRemote(world, args);
	}
	if (args[0] === "cat-file") {
		world.lookups.push(stdin);
		return ran(
			stdin
				.split("\n")
				.filter((l) => l !== "")
				.map((l) => {
					const [sha = ""] = l.split(":");
					const text =
						world.blobs[flagged ? sha : (world.replaced[sha] ?? sha)];
					return text === undefined
						? `${l} missing`
						: `${blobId(text)} blob ${text.length}`;
				})
				.join("\n"),
		);
	}
	const out = world.git[args.join(" ")];
	return out === undefined ? ran("", 128) : ran(out);
};

/** The answer of the `git` file in `fakeGit`: one blob id for every text, so each lookup matches. */
export const fakeGitRun = (argv: readonly string[], stdin = "") => {
	const same = "f".repeat(40);
	return argv.includes("cat-file")
		? ran(
				stdin
					.split("\n")
					.filter((l) => l !== "")
					.map(() => `${same} blob 1`)
					.join("\n"),
			)
		: ran(`${same}\n`);
};

/** The answer of a stubbed `/bin/rm`: it deletes the paths of its args, unless `world.rm` makes it fail or reject. */
export const rmRun = (world: World, argv: readonly string[]) => {
	if (world.rm === "reject") {
		return { deny: "ENOENT" };
	}
	if (world.rm === "fail") {
		return ran("", 1);
	}
	for (const a of argv.slice(1)) {
		delete world.files[a];
	}
	return ran("");
};
