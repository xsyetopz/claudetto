#!/usr/bin/env -S bun --no-env-file
// Usage: bun claudekit/worktree-base/main.ts enter|agent [BASE_REF] [--plugin-dir DIR]
// Builds a repo whose branch `feat` is ahead of `origin/main`, makes one worktree in a `claude -p` session
// against the fake API, with `EnterWorktree` or an `Agent` with `isolation: "worktree"`, and prints the
// commit the worktree starts at next to the tip of `feat`. `BASE_REF` is written as `worktree.baseRef`.
// It makes no paid call.

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn } from "bun";
import { startFakeApi } from "../api/fake.ts";
import { fakeApiEnv, withoutSessionVariables } from "../session/env.ts";

const GUARD = "This worktree starts at";
const TIMEOUT_MS = 90_000;
const AGENT_HEAD = /WORKTREE_HEAD=[0-9a-f]{7,}:[^"\\]*/;
const GUARD_LINE = new RegExp(`${GUARD}[^"]{0,420}`);

const argv = process.argv.slice(2);
const at = argv.indexOf("--plugin-dir");
const pluginArg = at === -1 ? undefined : argv[at + 1];
// `claude` runs inside the new repo, so a relative path would point there.
const pluginDir = pluginArg === undefined ? undefined : resolve(pluginArg);
const [tool, baseRef] = at === -1 ? argv : argv.toSpliced(at, 2);

const gitEnv = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null" };
const git = async (cwd: string, ...args: string[]): Promise<string> => {
	const child = spawn(["git", ...args], {
		cwd,
		env: gitEnv,
		stdout: "pipe",
		stderr: "pipe",
	});
	const out = await new Response(child.stdout).text();
	await child.exited;
	return out.trim();
};
const commit = (dir: string, message: string, ...extra: string[]) =>
	git(
		dir,
		"-c",
		"user.name=t",
		"-c",
		"user.email=t@t",
		"commit",
		...extra,
		"-m",
		message,
	);

const run = async (mode: "enter" | "agent", root: string): Promise<void> => {
	const origin = join(root, "origin.git");
	const repo = join(root, "repo");
	const config = join(root, "config");
	await mkdir(repo);
	await mkdir(config);
	await git(root, "init", "--bare", "-b", "main", origin);
	await git(repo, "init", "-b", "main");
	await commit(repo, "A", "--allow-empty");
	await git(repo, "remote", "add", "origin", origin);
	await git(repo, "push", "-u", "origin", "main");
	await git(repo, "remote", "set-head", "origin", "main");
	await git(repo, "switch", "-c", "feat");
	await commit(repo, "B", "--allow-empty");
	if (baseRef !== undefined) {
		await mkdir(join(repo, ".claude"));
		await writeFile(
			join(repo, ".claude", "settings.json"),
			JSON.stringify({ worktree: { baseRef } }),
		);
		await git(repo, "add", ".claude");
		await commit(repo, "C settings");
	}

	const api = startFakeApi(
		mode === "agent"
			? [
					{
						name: "Agent",
						input: {
							description: "probe",
							prompt: "say ok",
							subagent_type: "general-purpose",
							isolation: "worktree",
							run_in_background: false,
						},
					},
					{
						name: "Bash",
						input: {
							command: "git log -1 --format=WORKTREE_HEAD=%h:%s",
							description: "head",
						},
					},
				]
			: { name: "EnterWorktree", input: { name: "probe" } },
	);
	const child = spawn(
		[
			"claude",
			"-p",
			"go",
			...(pluginDir === undefined ? [] : ["--plugin-dir", pluginDir]),
			"--allowedTools",
			"EnterWorktree,Agent,Bash(git *)",
			"--output-format",
			"stream-json",
			"--verbose",
		],
		{
			cwd: repo,
			env: {
				...withoutSessionVariables(process.env),
				...fakeApiEnv(api.url, config),
			},
			timeout: TIMEOUT_MS,
			stdout: "pipe",
			stderr: "pipe",
		},
	);
	const out = await new Response(child.stdout).text();
	const exitCode = await child.exited;
	await api.stop();

	// The agent's worktree is removed when it ends, so its start is read from its own `git log`.
	const agentHead = out.match(AGENT_HEAD)?.[0];
	const worktrees = await git(repo, "worktree", "list");
	const guard = api.bodies
		.map((body) => body.match(GUARD_LINE)?.[0])
		.filter((line) => line !== undefined);
	process.stdout.write(
		[
			`claude exit ${exitCode}, requests ${api.bodies.length}`,
			`feat tip     ${await git(repo, "rev-parse", "--short", "feat")}`,
			`origin/main  ${await git(repo, "rev-parse", "--short", "origin/main")}`,
			...(agentHead === undefined ? [] : [`agent start  ${agentHead}`]),
			`worktrees:\n${worktrees}`,
			`guard lines: ${JSON.stringify(guard)}`,
			"",
		].join("\n"),
	);
};

if (tool === "enter" || tool === "agent") {
	const root = await mkdtemp("/tmp/worktree-base-");
	try {
		await run(tool, root);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
} else {
	process.stderr.write(
		"usage: worktree-base enter|agent [BASE_REF] [--plugin-dir DIR]\n",
	);
	process.exitCode = 2;
}
