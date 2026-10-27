// The shared setup of the tests of `dev/eval-variant.ts`.
// The tool runs as a copy in a temporary repository with the same layout, so the real
// repository gets no worktree. A fake `claude` on `PATH` stands for `claude plugin eval`.

import { copyFile, cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { spawn as bunSpawn, write as bunWrite } from "bun";
import { withPathFirst, writeProgram } from "../support/fake-program.ts";
import { type Env, REPO, tmpDir } from "../support/repo.ts";

/** The paths of a test repository, as `setUp` makes them. */
export interface Sandbox {
	repo: string;
	bin: string;
	tmp: string;
}

const TOOL = path.join(REPO, "dev/eval-variant.ts");
const COMPARE = path.join(REPO, "dev/eval-compare");

// Writes a file in `evals/results/` of the plugin path (the argument after `eval`).
// Writes a valid result document to the file after `--json`, because the compare command reads it.
// The document names the plugin path, because the compare command refuses a result of another plugin.
// Exits with `FAKE_EXIT`.
const FAKE_CLAUDE = `(async () => {
const fs = require("node:fs");
const path = require("node:path");
const plugin = process.argv[4];
const results = path.join(plugin, "evals", "results");
fs.mkdirSync(results, { recursive: true });
await Bun.write(path.join(results, "run.txt"), plugin);
const json = process.argv.indexOf("--json");
if (json !== -1)
  await Bun.write(process.argv[json + 1], JSON.stringify({ partial: false, suite: { plugins: [{ name: "p", path: plugin }] }, cases: [{ aggregates: { score: 1, scoreWithout: 0.5 } }] }));
process.exit(Number(process.env.FAKE_EXIT ?? 0));
})();
`;

/**
 * Runs `cmd` with `args` through `Bun.spawn`, and gives the exit code and the text output.
 * The shape is the one of `spawnSync` with `encoding: "utf8"`, so each caller reads `status`, `stdout`, and `stderr`.
 */
export const spawnText = async (
	cmd: string,
	args: string[],
	options: { env?: Env; cwd?: string } = {},
) => {
	const child = bunSpawn([cmd, ...args], {
		...options,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, status] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	return { status, stdout, stderr };
};

/** The standard output of `git -C cwd args`. It throws with the standard error when `git` fails, so a test that uses it fails. */
export const git = async (cwd: string, ...args: string[]) => {
	const r = await spawnText("git", ["-C", cwd, ...args]);
	if (r.status !== 0) {
		throw new Error(`git ${args.join(" ")} failed (${r.status}): ${r.stderr}`);
	}
	return r.stdout;
};

/** The repository of a test, with one commit and a branch. A copy of the template, because each `git` call costs most of the time. */
let template: string | undefined;
const templateRepo = async () => {
	if (template) {
		return template;
	}
	const repo = path.join(await tmpDir("lab-variant-template"), "repo");
	await Promise.all(
		[path.join(repo, "dev"), path.join(repo, "plugins/claudetto")].map((d) =>
			mkdir(d, { recursive: true }),
		),
	);
	await copyFile(TOOL, path.join(repo, "dev/eval-variant.ts"));
	// The tool calls the compare command in `dev/eval-compare/`, so the copy has the command too.
	await cp(COMPARE, path.join(repo, "dev/eval-compare"), {
		recursive: true,
	});
	await bunWrite(path.join(repo, "plugins/claudetto/README.md"), "plugin\n");
	await bunWrite(
		path.join(repo, ".gitignore"),
		"/plugins/claudetto/evals/results/\n",
	);
	await git(repo, "init", "-q", "-b", "main");
	await git(repo, "add", "-A");
	await git(
		repo,
		"-c",
		"user.name=t",
		"-c",
		"user.email=t@example.com",
		"-c",
		"commit.gpgsign=false",
		"commit",
		"-q",
		"-m",
		"one",
	);
	await git(repo, "branch", "feature/x+y");
	template = repo;
	return repo;
};

export const setUp = async (): Promise<Sandbox> => {
	const dir = await tmpDir("lab-variant");
	const repo = path.join(dir, "repo");
	const bin = path.join(dir, "bin");
	const tmp = path.join(dir, "tmp");
	await Promise.all([bin, tmp].map((d) => mkdir(d, { recursive: true })));
	await cp(await templateRepo(), repo, { recursive: true });
	await writeProgram(bin, "claude", FAKE_CLAUDE);
	return { repo, bin, tmp };
};

export const run = (s: Sandbox, ref: string, exit: number) =>
	spawnText(
		process.execPath,
		["--no-env-file", path.join(s.repo, "dev/eval-variant.ts"), ref],
		{
			env: {
				...withPathFirst(process.env, s.bin),
				TMPDIR: s.tmp,
				FAKE_EXIT: String(exit),
			},
		},
	);

export const worktrees = async (s: Sandbox) =>
	(await git(s.repo, "worktree", "list", "--porcelain"))
		.split("\n")
		.filter((l) => l.startsWith("worktree "));
export const resultsRoot = (s: Sandbox) =>
	path.join(s.repo, "plugins/claudetto/evals/results");
export const kept = async (s: Sandbox) =>
	(await readdir(resultsRoot(s))).filter((n) => n.startsWith("variant-"));
