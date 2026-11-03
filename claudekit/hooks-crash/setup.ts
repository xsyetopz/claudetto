// The folders of one crash run: a clone to work in, and either this machine's config or a private one for a fake API.

import { cp, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { spawnCommand } from "../session/command.ts";
import { FAKE_KEY } from "../session/env.ts";
import { interactiveConfig } from "../session/tmux.ts";

/** The folder name `claude` gives a project's transcripts. */
export const projectSlug = (cwd: string): string =>
	cwd.replaceAll(/[^a-zA-Z0-9]/g, "-");

const git = async (args: readonly string[], cwd: string): Promise<void> => {
	const ran = await spawnCommand(["git", ...args], { cwd, timeoutMs: 300_000 });
	if (ran.code !== 0) {
		throw new Error(`git ${args.join(" ")}: ${ran.stderr.trim()}`);
	}
};

/** A clone of `repo` at `cwd` with no remote, so nothing the session does can reach a shared branch. */
export const cloneWork = async (repo: string, cwd: string): Promise<void> => {
	await git(["clone", "-q", "--local", repo, cwd], "/");
	await git(["remote", "remove", "origin"], cwd);
};

/** A config folder with a copy of this machine's settings and installed plugins, trusted for `cwd` and the fake key. */
export const fakeConfig = async (
	config: string,
	cwd: string,
): Promise<void> => {
	const home = join(homedir(), ".claude");
	await cp(join(home, "plugins"), join(config, "plugins"), { recursive: true });
	await cp(join(home, "settings.json"), join(config, "settings.json"));
	await writeFile(
		join(config, ".claude.json"),
		JSON.stringify({
			...JSON.parse(interactiveConfig(cwd, FAKE_KEY)),
			bypassPermissionsModeAccepted: true,
		}),
	);
};

/** Copies `transcript` where a session in `cwd` finds it, and returns the `--resume` id. */
export const placeResume = async (
	transcript: string,
	projects: string,
	cwd: string,
): Promise<string> => {
	const dir = join(projects, projectSlug(cwd));
	await mkdir(dir, { recursive: true });
	const id = basename(transcript, ".jsonl");
	await cp(transcript, join(dir, `${id}.jsonl`));
	return id;
};
