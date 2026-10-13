// The `drift` command writes nothing, and the count of added runtime paths is the count of the lines that setup adds.
// The tests run `git` in a temp folder, with the ignore file of the user hidden by the repository config.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { main } from "../../../plugins/dotclaude/slices/setup/adapters/cli.ts";
import {
  EXCLUDE_HEADER,
  RUNTIME_PATTERNS,
} from "../../../plugins/dotclaude/slices/setup/domain/exclude.ts";

/** A new git repository with no runtime rule, and a config folder apart from the user's. */
const repository = (): { repo: string; env: NodeJS.ProcessEnv } => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "exclude-write-"));
  const repo = path.join(base, "repo");
  fs.mkdirSync(repo);
  const init = Bun.spawnSync(["git", "init", "-q"], { cwd: repo });
  if (init.exitCode !== 0) throw new Error("git init failed");
  const env = {
    ...process.env,
    CLAUDE_CONFIG_DIR: path.join(base, "config"),
    CLAUDE_PROJECT_DIR: repo,
    GIT_CONFIG_GLOBAL: path.join(base, "gitconfig"),
    XDG_CONFIG_HOME: path.join(base, "xdg"),
  };
  return { repo, env };
};

const excludeOf = (repo: string): string =>
  path.join(repo, ".git", "info", "exclude");

/** The text of `file`, or undefined when it does not exist. */
const readOrUndefined = async (file: string): Promise<string | undefined> => {
  const bunFile = Bun.file(file);
  return (await bunFile.exists()) ? bunFile.text() : undefined;
};

test("drift writes nothing to .git/info/exclude", async () => {
  const { repo, env } = repository();
  const before = await readOrUndefined(excludeOf(repo));
  const logs: string[] = [];
  const io = {
    log: (l: string) => logs.push(l),
    error: (l: string) => logs.push(l),
  };
  await main(["drift", "--scope", "project"], env, repo, io);
  const after = await readOrUndefined(excludeOf(repo));
  expect(after).toBe(before);
  expect(logs.join("\n")).not.toContain("Added runtime paths");
});

test("settings --apply counts the paths it adds, not the header line", async () => {
  const { repo, env } = repository();
  fs.mkdirSync(path.join(repo, ".git", "info"), { recursive: true });
  await Bun.write(excludeOf(repo), `${EXCLUDE_HEADER}\n`);
  const logs: string[] = [];
  const io = {
    log: (l: string) => logs.push(l),
    error: (l: string) => logs.push(l),
  };
  await main(["settings", "--scope", "project", "--apply"], env, repo, io);
  expect(logs).toContain(
    `Added runtime paths to .git/info/exclude: ${RUNTIME_PATTERNS.length}.`,
  );
});
