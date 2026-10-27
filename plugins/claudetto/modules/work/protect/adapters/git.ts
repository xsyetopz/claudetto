// The `git` reads of the `protect` slice: the pin of what git had at the first `Bash` call, and the stamps of the settings that `git ls-remote` reads.

import {
	type Known,
	opaqueOf,
	parseRefs,
	parseUrls,
	readConfig,
} from "../domain/protect.ts";
import { BIN_SCRIPT, GIT_TIMEOUT_MS, SSH_CONFIG } from "../limits.ts";
import { realOf, textOf } from "./files.ts";
import type { Io } from "./io.ts";

const TRAILING_SLASHES = /\/+$/;

/** The stdout of `git` in `root`, run with `--no-replace-objects` because a call can `git replace` a commit that is known, or `undefined` when it fails (no repo, or a fault). It runs by the real path that the pin holds (`Known.git`), so a `git` that a call puts earlier in `PATH` is not run. Before the pin, it runs by name. */
export const git = async (
	io: Io,
	root: string,
	args: string[],
	timeoutMs = GIT_TIMEOUT_MS,
	stdin?: string,
): Promise<string | undefined> => {
	const pinned = (await io.known().catch(() => undefined))?.value?.git;
	const run = await io
		.run([pinned ?? "git", "--no-replace-objects", "-C", root, ...args], {
			timeoutMs,
			...(stdin === undefined ? {} : { stdin }),
		})
		.catch(() => undefined);
	return run?.exitCode === 0 ? run.stdout : undefined;
};

export const REFS = ["for-each-ref", "--format=%(objectname) %(refname)"];

/** The remotes with their URLs, after `url.<base>.insteadOf`, as `ls-remote` reads them. */
export const REMOTES = ["remote", "-v"];

/** The real paths of the programs `ssh` and `git` that `PATH` names, as `{ ssh, git }`, empty for a program that `PATH` does not have, or `undefined` when the lookup fails or `git` is missing. */
export const binOf = async (
	io: Io,
): Promise<{ ssh: string; git: string } | undefined> => {
	const run = await io
		.run(["/bin/sh", "-c", BIN_SCRIPT], { timeoutMs: GIT_TIMEOUT_MS })
		.catch(() => undefined);
	if (run?.exitCode !== 0) {
		return undefined;
	}
	const found: { [name: string]: string } = {};
	for (const line of run.stdout.split("\n")) {
		const at = line.indexOf("=");
		if (at > 0) {
			found[line.slice(0, at)] = line.slice(at + 1).trim();
		}
	}
	if (!found["git"]) {
		return undefined;
	}
	return {
		ssh: found["ssh"] ? await realOf(io, found["ssh"]) : "",
		git: await realOf(io, found["git"]),
	};
};

/** The settings of `git` and `ssh` that `git ls-remote` reads, as the blob id of each source (see `Known.stamps`), and what blocks the trust of a remote (see `Known.opaque`). `undefined` when `git` cannot give them. The blob id comes from `git hash-object --stdin`, so the state holds no config text. */
export const stampsOf = async (
	io: Io,
	root: string,
): Promise<
	| { stamps: { [source: string]: string }; opaque: string[]; git: string }
	| undefined
> => {
	const list = await git(io, root, [
		"config",
		"--list",
		"--show-origin",
		"--show-scope",
	]);
	const env = await io.env();
	const home = (env["HOME"] ?? "").replace(TRAILING_SLASHES, "");
	const path = `${home}/${SSH_CONFIG}`;
	const exists = home !== "" && (await io.exists(path).catch(() => false));
	const ssh = exists ? await textOf(io, path) : "";
	const bin = await binOf(io);
	if (list === undefined || ssh === undefined || bin === undefined) {
		return undefined;
	}
	const config = readConfig(list);
	const texts = [
		config,
		ssh,
		Object.entries(env)
			.map(([name, value]) => `${name}=${value}`)
			.join("\n"),
		`ssh=${bin.ssh}\ngit=${bin.git}`,
	];
	const ids = await Promise.all(
		texts.map(async (text) =>
			(
				await git(io, root, ["hash-object", "--stdin"], GIT_TIMEOUT_MS, text)
			)?.trim(),
		),
	);
	const [c, s, v, b] = ids;
	if (!c || !s || !v || !b) {
		return undefined;
	}
	const roots = [home, await realOf(io, home), root, await realOf(io, root)];
	return {
		stamps: { config: c, ssh: s, env: v, bin: b },
		opaque: opaqueOf({ config, ssh, env, paths: bin, roots }),
		git: bin.git,
	};
};

/** No commit is trusted: the state of a folder that is no git repo, or of a first `git` call that failed. `told: false` means that the model did not get the line `NO_COMMITS_AT_START` yet. The state takes no `undefined`. */
const NO_COMMITS: Known = { commits: [], remotes: {}, urls: {}, told: false };

/** The commits of `HEAD`, the stash, and the refs now, in this order, the remote-tracking refs, and the fetch URL of each remote, or `NO_COMMITS` with no git repo. `fromGit` reads the first `GIT_COMMITS_MAX`, so `HEAD` and the stash come first, and a repo with many refs still trusts the commits of `git checkout` and `git stash pop`. */
const knownNow = async (io: Io, root: string): Promise<Known> => {
	const refs = await git(io, root, REFS);
	const head = await git(io, root, ["rev-parse", "HEAD"]);
	if (refs === undefined || head === undefined) {
		return NO_COMMITS;
	}
	const stash = await git(io, root, ["stash", "list", "--format=%H"]);
	const pairs = parseRefs(refs);
	const seen = await stampsOf(io, root);
	return {
		...(seen === undefined ? {} : { stamps: seen.stamps, git: seen.git }),
		opaque: seen?.opaque ?? ["all"],
		urls: parseUrls((await git(io, root, REMOTES)) ?? ""),
		commits: [
			head.trim(),
			...(stash ?? "").split("\n").filter((l) => l !== ""),
			...pairs.map(([sha]) => sha),
		],
		remotes: Object.fromEntries(
			pairs
				.filter(([, ref]) => ref.startsWith("refs/remotes/"))
				.map(([s, r]) => [r, s]),
		),
	};
};

/** Saves what git has now under the id `session`, once: the first call of this function in the session fixes what is trusted, and a ref that a later call moved or made is not. */
export const pin = async (
	io: Io,
	root: string,
	early = false,
): Promise<void> => {
	if (root === "") {
		return;
	}
	// At the start, a root with no `.git` entry has nothing to pin: the first `Bash` call tries again.
	if (early && !(await io.exists(`${root}/.git`))) {
		return;
	}
	const { value, version } = await io.known();
	if (value !== undefined) {
		return;
	}
	const known = await knownNow(io, root);
	// The pin of `session.start` may end while this one runs, and the first pin wins: a write that landed since the read above makes `ifVersion` fail.
	await io.pin(known, version);
};
