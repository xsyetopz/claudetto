// The shared setup of the tests of `tools/eval-variant.ts`.
// The tool runs as a copy in a temporary repository with the same layout, so the real
// repository gets no worktree. A fake `claude` on `PATH` stands for `claude plugin eval`.

import { expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { withPathFirst, writeProgram } from "../support/fake-program.ts";
import { type Env, PLUGINS, REPO, tmpDir } from "../support/repo.ts";

/** The paths of a test repository, as `setUp` makes them. */
export type Sandbox = { repo: string; bin: string; tmp: string };

const TOOL = path.join(REPO, "tools/eval-variant.ts");
const LAB = path.join(PLUGINS, "dotclaude-lab");

// Writes a file in `evals/results/` of the plugin path (the argument after `eval`).
// Exits with `FAKE_EXIT`.
const FAKE_CLAUDE = `(async () => {
const fs = require("node:fs");
const path = require("node:path");
const plugin = process.argv[4];
const results = path.join(plugin, "evals", "results");
fs.mkdirSync(results, { recursive: true });
await Bun.write(path.join(results, "run.txt"), plugin);
process.exit(Number(process.env.FAKE_EXIT ?? 0));
})();
`;

/**
 * Runs `cmd` with `args` through `Bun.spawnSync`, and gives the exit code and the text output.
 * The shape is the one of `spawnSync` with `encoding: "utf8"`, so each caller reads `status`, `stdout`, and `stderr`.
 */
export function spawnText(
  cmd: string,
  args: string[],
  options: { env?: Env; cwd?: string } = {},
) {
  const r = Bun.spawnSync([cmd, ...args], options);
  return {
    status: r.exitCode,
    stdout: r.stdout.toString(),
    stderr: r.stderr.toString(),
  };
}

export function git(cwd: string, ...args: string[]) {
  const r = spawnText("git", ["-C", cwd, ...args]);
  expect(r.status, r.stderr).toBe(0);
  return r.stdout;
}

/** The repository of a test, with one commit and a branch. A copy of the template, because each `git` call costs most of the time on Windows. */
let template: string | undefined;
async function templateRepo() {
  if (template) return template;
  const repo = path.join(tmpDir("lab-variant-template"), "repo");
  for (const d of [
    path.join(repo, "tools"),
    path.join(repo, "plugins/dotclaude"),
  ])
    fs.mkdirSync(d, { recursive: true });
  fs.copyFileSync(TOOL, path.join(repo, "tools/eval-variant.ts"));
  // The tool calls the compare command of the plugin, so the copy has the plugin too.
  fs.cpSync(LAB, path.join(repo, "plugins/dotclaude-lab"), { recursive: true });
  await Bun.write(path.join(repo, "plugins/dotclaude/README.md"), "plugin\n");
  await Bun.write(
    path.join(repo, ".gitignore"),
    "/plugins/dotclaude/evals/results/\n",
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
}

export async function setUp(): Promise<Sandbox> {
  const dir = tmpDir("lab-variant");
  const repo = path.join(dir, "repo");
  const bin = path.join(dir, "bin");
  const tmp = path.join(dir, "tmp");
  for (const d of [bin, tmp]) fs.mkdirSync(d, { recursive: true });
  fs.cpSync(await templateRepo(), repo, { recursive: true });
  await writeProgram(bin, "claude", FAKE_CLAUDE);
  return { repo, bin, tmp };
}

export function run(s: Sandbox, ref: string, exit: number) {
  return spawnText(
    process.execPath,
    ["--no-env-file", path.join(s.repo, "tools/eval-variant.ts"), ref],
    {
      env: {
        ...withPathFirst(process.env, s.bin),
        TMPDIR: s.tmp,
        FAKE_EXIT: String(exit),
      },
    },
  );
}

export const worktrees = (s: Sandbox) =>
  git(s.repo, "worktree", "list", "--porcelain")
    .split("\n")
    .filter((l) => l.startsWith("worktree "));
export const resultsRoot = (s: Sandbox) =>
  path.join(s.repo, "plugins/dotclaude/evals/results");
export const kept = (s: Sandbox) =>
  fs.readdirSync(resultsRoot(s)).filter((n) => n.startsWith("variant-"));
