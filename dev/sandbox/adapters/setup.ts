import { mkdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { spawn, which, write } from "bun";
import { SANDBOX_MARKER } from "../domain/clean.ts";
import { readJson } from "./login.ts";

export interface SandboxDirs {
	root: string;
	config: string;
	home: string;
	project: string;
}

interface ClaudeState {
	hasCompletedOnboarding?: boolean;
	theme?: string;
	projects?: Record<string, object>;
}

/** True when `file` exists, of any kind. */
export const exists = async (file: string): Promise<boolean> => {
	const found = await stat(file).catch(() => null);
	return found !== null;
};

export const setUp = async ({
	root,
	config,
	home,
	project,
}: SandboxDirs): Promise<void> => {
	await mkdir(root, { recursive: true });
	await write(path.join(root, SANDBOX_MARKER), "");
	await mkdir(config, { recursive: true });
	await mkdir(home, { recursive: true });
	if (!(await exists(path.join(project, ".git")))) {
		await mkdir(project, { recursive: true });
		if (which("git")) {
			await spawn(["git", "init", "-q", project]).exited;
		}
	}
	const state = path.join(config, ".claude.json");
	const json: ClaudeState = (await readJson<ClaudeState>(state)) ?? {};
	json.hasCompletedOnboarding = true;
	json.theme ??= "dark";
	json.projects ??= {};
	// macOS resolves `/tmp` and `/var` to `/private`, and the trust key is the resolved path.
	const real = await realpath(project);
	for (const dir of new Set([project, real])) {
		json.projects[dir] = {
			...json.projects[dir],
			hasTrustDialogAccepted: true,
		};
	}
	await write(state, JSON.stringify(json, null, 2));
};

export const availableModels = async (
	config: string,
): Promise<string[] | undefined> =>
	(
		await readJson<{ availableModels?: string[] }>(
			path.join(config, "settings.json"),
		)
	)?.availableModels;

// Claude runs in the project, so a relative `--plugin-dir` would point into it and be skipped.
export const absolutePluginDirs = (
	args: string[],
	cwd: string = process.cwd(),
): string[] =>
	args.map((a, i) => {
		if (args[i - 1] === "--plugin-dir") {
			return path.resolve(cwd, a);
		}
		return a.startsWith("--plugin-dir=")
			? `--plugin-dir=${path.resolve(cwd, a.slice(13))}`
			: a;
	});
