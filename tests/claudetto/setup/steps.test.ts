// The checks before a write and the reads that fail, in the CLI of the `setup` slice.
// Each test builds a scratch repository under the temp folder and calls `main` with a stub of the output.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { main } from "../../../plugins/claudetto/slices/setup/adapters/cli.ts";
import { projectRuleProblems } from "../../../plugins/claudetto/slices/setup/adapters/rules-check.ts";
import { tmpDir } from "../../support/repo.ts";

const io = (out: string[] = []) => ({
  log: (l: string) => out.push(l),
  error: (l: string) => out.push(l),
});

/** A git repository with a `.claude/rules/r.md` rule that has `glob` in `paths`. */
const withRule = async (glob: string): Promise<string> => {
  const repo = tmpDir("steps-rules");
  expect(Bun.spawnSync(["git", "init", "-q"], { cwd: repo }).exitCode).toBe(0);
  fs.mkdirSync(path.join(repo, ".claude", "rules"), { recursive: true });
  await Bun.write(
    path.join(repo, ".claude", "rules", "r.md"),
    `---\npaths:\n  - "${glob}"\n---\nx\n`,
  );
  return repo;
};

test("a tracked file with a space or a non-ASCII letter in its name matches a rule glob", async () => {
  const repo = await withRule("docs/**");
  fs.mkdirSync(path.join(repo, "docs"));
  await Bun.write(path.join(repo, "docs", "año notes.md"), "");
  expect(await projectRuleProblems(repo)).toEqual([]);
});

test("a glob that matches no file is a problem when git lists the files", async () => {
  const repo = await withRule("lib/**");
  expect(await projectRuleProblems(repo)).toEqual([
    { rule: ".claude/rules/r.md", kind: "no-match", glob: "lib/**" },
  ]);
});

test("a failed git call is a `git` problem, not a `no-match` problem, and a broken front matter is still found", async () => {
  const repo = await withRule("lib/**");
  // A `.git` file that points nowhere makes each git call exit with an error.
  fs.rmSync(path.join(repo, ".git"), { recursive: true });
  await Bun.write(path.join(repo, ".git"), "gitdir: /nonexistent\n");
  expect(await projectRuleProblems(repo)).toEqual([
    { rule: ".claude/rules", kind: "git" },
  ]);
  await Bun.write(
    path.join(repo, ".claude", "rules", "r.md"),
    "---\npaths: [open\n---\nx\n",
  );
  expect(await projectRuleProblems(repo)).toEqual([
    { rule: ".claude/rules", kind: "git" },
    { rule: ".claude/rules/r.md", kind: "yaml" },
  ]);
});

/** A repository and the environment of one CLI run in it. */
const run = (): { repo: string; env: NodeJS.ProcessEnv; exclude: string } => {
  const base = tmpDir("steps-cli");
  const repo = path.join(base, "repo");
  fs.mkdirSync(repo);
  expect(Bun.spawnSync(["git", "init", "-q"], { cwd: repo }).exitCode).toBe(0);
  return {
    repo,
    exclude: path.join(repo, ".git", "info", "exclude"),
    env: {
      ...process.env,
      CLAUDE_CONFIG_DIR: path.join(base, "config"),
      CLAUDE_PROJECT_DIR: repo,
      GIT_CONFIG_GLOBAL: path.join(base, "gitconfig"),
      XDG_CONFIG_HOME: path.join(base, "xdg"),
    },
  };
};

test("`settings --apply` with an unknown scope writes no exclude line", async () => {
  const { repo, env, exclude } = run();
  const before = fs.existsSync(exclude) ? await Bun.file(exclude).text() : "";
  expect(
    await main(["settings", "--scope", "nowhere", "--apply"], env, repo, io()),
  ).toBe(2);
  const after = fs.existsSync(exclude) ? await Bun.file(exclude).text() : "";
  expect(after).toBe(before);
});

test("`settings --apply` on a settings file that is not an object writes no exclude line", async () => {
  const { repo, env, exclude } = run();
  fs.mkdirSync(path.join(repo, ".claude"));
  await Bun.write(path.join(repo, ".claude", "settings.json"), "[]");
  const before = fs.existsSync(exclude) ? await Bun.file(exclude).text() : "";
  expect(
    await main(["settings", "--scope", "project", "--apply"], env, repo, io()),
  ).toBe(1);
  const after = fs.existsSync(exclude) ? await Bun.file(exclude).text() : "";
  expect(after).toBe(before);
});

test("`drift` and `settings` on a settings file that holds `null` name each snippet value as new", async () => {
  const { repo, env } = run();
  fs.mkdirSync(path.join(repo, ".claude"));
  await Bun.write(path.join(repo, ".claude", "settings.json"), "null");
  const drift: string[] = [];
  expect(
    await main(["drift", "--scope", "project"], env, repo, io(drift)),
  ).toBe(1);
  const plan: string[] = [];
  expect(
    await main(["settings", "--scope", "project"], env, repo, io(plan)),
  ).toBe(0);
  expect(plan.some((l) => l.startsWith("  env."))).toBe(true);
});

test("`drift` on a settings file that holds an array is an error", async () => {
  const { repo, env } = run();
  fs.mkdirSync(path.join(repo, ".claude"));
  await Bun.write(path.join(repo, ".claude", "settings.json"), "[]");
  expect(await main(["drift", "--scope", "project"], env, repo, io())).toBe(2);
});

test("`settings --apply` with an unknown option fails and writes no file", async () => {
  const { repo, env, exclude } = run();
  const before = await Bun.file(exclude).text();
  for (const bad of ["--aply", "--x"])
    expect(
      await main(
        ["settings", "--scope", "project", "--apply", bad],
        env,
        repo,
        io(),
      ),
    ).toBe(2);
  expect(await Bun.file(exclude).text()).toBe(before);
  expect(fs.existsSync(path.join(repo, ".claude", "settings.json"))).toBe(
    false,
  );
});

test("the git timeout of the CLI comes from `limits.ts`", async () => {
  const source = await Bun.file(
    path.join(
      import.meta.dirname,
      "../../../plugins/claudetto/slices/setup/adapters/git.ts",
    ),
  ).text();
  expect(source).not.toMatch(/\d_?\d{3}/);
});

test("`--scope` with no value is an error and writes no file", async () => {
  const { repo, env, exclude } = run();
  const before = await Bun.file(exclude).text();
  for (const argv of [
    ["settings", "--scope"],
    ["settings", "--scope", "--apply"],
    ["claude-md", "--scope", "--apply"],
  ]) {
    const out: string[] = [];
    expect(await main(argv, env, repo, io(out))).toBe(2);
    expect(out.join("\n")).toContain("--scope");
  }
  expect(await Bun.file(exclude).text()).toBe(before);
  expect(fs.existsSync(path.join(repo, "CLAUDE.md"))).toBe(false);
  expect(
    fs.existsSync(path.join(env["CLAUDE_CONFIG_DIR"] ?? "", "settings.json")),
  ).toBe(false);
});
