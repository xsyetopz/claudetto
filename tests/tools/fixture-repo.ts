// The shared setup of the tests of `dev/eval-variant.ts`.
// The tool runs as a copy in a temporary repository with the same layout, so the real
// repository gets no worktree. A fake `claude` on `PATH` stands for `claude plugin eval`.

import { expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { withPathFirst, writeProgram } from "../support/fake-program.ts";
import { type Env, REPO, tmpDir } from "../support/repo.ts";

/** The paths of a test repository, as `setUp` makes them. */
export type Sandbox = { repo: string; bin: string; tmp: string };

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
 * Runs `cmd` with `args` through `Bun.spawnSync`, and gives the exit code and the text output.
 * The shape is the one of `spawnSync` with `encoding: "utf8"`, so each caller reads `status`, `stdout`, and `stderr`.
 */
export const spawnText = (
  cmd: string,
  args: string[],
  options: { env?: Env; cwd?: string } = {},
) => {
  const r = Bun.spawnSync([cmd, ...args], options);
  return {
    status: r.exitCode,
    stdout: r.stdout.toString(),
    stderr: r.stderr.toString(),
  };
};

export const git = (cwd: string, ...args: string[]) => {
  const r = spawnText("git", ["-C", cwd, ...args]);
  expect(r.status, r.stderr).toBe(0);
  return r.stdout;
};

/** The repository of a test, with one commit and a branch. A copy of the template, because each `git` call costs most of the time. */
let template: string | undefined;
const templateRepo = async () => {
  if (template) return template;
  const repo = path.join(tmpDir("lab-variant-template"), "repo");
  for (const d of [
    path.join(repo, "dev"),
    path.join(repo, "plugins/claudetto"),
  ])
    fs.mkdirSync(d, { recursive: true });
  fs.copyFileSync(TOOL, path.join(repo, "dev/eval-variant.ts"));
  // The tool calls the compare command in `dev/eval-compare/`, so the copy has the command too.
  fs.cpSync(COMPARE, path.join(repo, "dev/eval-compare"), {
    recursive: true,
  });
  await Bun.write(path.join(repo, "plugins/claudetto/README.md"), "plugin\n");
  await Bun.write(
    path.join(repo, ".gitignore"),
    "/plugins/claudetto/evals/results/\n",
  );
  git(repo, "init", "-q", "-b", "main");
  git(repo, "add", "-A");
  git(
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
  git(repo, "branch", "feature/x+y");
  template = repo;
  return repo;
};

export const setUp = async (): Promise<Sandbox> => {
  const dir = tmpDir("lab-variant");
  const repo = path.join(dir, "repo");
  const bin = path.join(dir, "bin");
  const tmp = path.join(dir, "tmp");
  for (const d of [bin, tmp]) fs.mkdirSync(d, { recursive: true });
  fs.cpSync(await templateRepo(), repo, { recursive: true });
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

export const worktrees = (s: Sandbox) =>
  git(s.repo, "worktree", "list", "--porcelain")
    .split("\n")
    .filter((l) => l.startsWith("worktree "));
export const resultsRoot = (s: Sandbox) =>
  path.join(s.repo, "plugins/claudetto/evals/results");
export const kept = (s: Sandbox) =>
  fs.readdirSync(resultsRoot(s)).filter((n) => n.startsWith("variant-"));
