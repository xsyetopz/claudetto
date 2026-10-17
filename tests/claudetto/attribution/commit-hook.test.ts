// Runs the `commit-msg` hook script of `kernel/commit-hook` in a real git repository.
// The hook reaches git through `GIT_CONFIG_COUNT` and the keys, as the `env` of the settings does, so these tests need git 2.54 or later.
// Each test uses a temporary home folder and repository, so no real file changes.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { planCommitHook } from "../../../plugins/claudetto/slices/setup/domain/commit-hook.ts";
import {
  ATTRIBUTION_DIR,
  HOOK_NAME,
} from "../../../src/kernel/commit-hook/index.ts";
import { tmpDir } from "../../support/repo.ts";

const LINE = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>";
const SESSION = "sess-1";

/** The env of a `Bash` call of Claude: the session id, and the mark that the `policy` slice sets for the call. */
const CLAUDE = { CLAUDE_CODE_SESSION_ID: SESSION, CLAUDETTO_AGENT_CALL: "1" };

const git = Bun.spawnSync(["git", "--version"]).stdout.toString();
const [major = 0, minor = 0] = (git.match(/(\d+)\.(\d+)/) ?? [])
  .slice(1)
  .map(Number);
const hooked = major > 2 || (major === 2 && minor >= 54);

/** A repository with a staged file, a home folder, and the lines that the hook knows. */
const world = async (
  lines: Record<string, string> = {},
  repoConfig: [string, string][] = [],
) => {
  const root = tmpDir("dc-commit-hook");
  const home = path.join(root, "home");
  const repo = path.join(root, "repo");
  fs.mkdirSync(path.join(home, ATTRIBUTION_DIR, SESSION), { recursive: true });
  fs.mkdirSync(repo);
  for (const [file, line] of Object.entries(lines))
    await Bun.write(path.join(home, ATTRIBUTION_DIR, SESSION, file), line);
  const env = {
    PATH: process.env["PATH"] ?? "",
    HOME: home,
    GIT_CONFIG_NOSYSTEM: "1",
    // The keys that setup writes to the `env` of the settings.
    ...(planCommitHook({}, []) as { env: Record<string, string> }).env,
  };
  const run = (argv: string[], extra: Record<string, string> = {}) =>
    Bun.spawnSync(argv, { cwd: repo, env: { ...env, ...extra } });
  run(["git", "init", "-q"]);
  for (const [key, value] of repoConfig) run(["git", "config", key, value]);
  await Bun.write(path.join(repo, "a.txt"), "a\n");
  run(["git", "add", "a.txt"]);
  return (message: string, extra: Record<string, string> = {}) => {
    const out = run(
      [
        "git",
        "-c",
        "user.name=T",
        "-c",
        "user.email=t@example.com",
        "commit",
        "-q",
        "-m",
        message,
      ],
      extra,
    );
    return { code: out.exitCode, err: out.stderr.toString() };
  };
};

const when = hooked ? test : test.skip;

when("a commit with no session variable passes", async () => {
  const commit = await world({ main: LINE });
  expect(commit("Fix it.").code).toBe(0);
});

when(
  "a commit of a `!` command of the user, with the session id and no mark, passes",
  async () => {
    const commit = await world({ main: LINE });
    const out = commit("Fix it.", { CLAUDE_CODE_SESSION_ID: SESSION });
    expect(out.code).toBe(0);
  },
);

when("a message that ends with the line passes", async () => {
  const commit = await world({ main: LINE });
  const out = commit(`Fix it.\n\n${LINE}`, CLAUDE);
  expect(out.code).toBe(0);
});

when("the line before a `Signed-off-by` trailer passes", async () => {
  const commit = await world({ main: LINE });
  const message = `Fix it.\n\n${LINE}\nSigned-off-by: T <t@example.com>`;
  expect(commit(message, CLAUDE).code).toBe(0);
});

when("a message with no line is rejected with a note", async () => {
  const commit = await world({ main: LINE });
  const out = commit("Fix it.", CLAUDE);
  expect(out.code).not.toBe(0);
  expect(out.err).toContain(LINE);
});

when("a session with no recorded line passes", async () => {
  const commit = await world();
  const out = commit("Fix it.", CLAUDE);
  expect(out.code).toBe(0);
});

when("a session with an empty record passes", async () => {
  const commit = await world({ main: "" });
  const out = commit("Fix it.", CLAUDE);
  expect(out.code).toBe(0);
});

when("the line of a subagent passes", async () => {
  const other = "Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>";
  const commit = await world({ main: LINE, "agent-haiku": other });
  const out = commit(`Fix it.\n\n${other}`, CLAUDE);
  expect(out.code).toBe(0);
});

when("a line that is only part of the last line is rejected", async () => {
  const commit = await world({ main: LINE });
  const out = commit(`Fix it.\n\nNote: ${LINE}`, CLAUDE);
  expect(out.code).not.toBe(0);
});

const OFF: [string, string][] = [[`hook.${HOOK_NAME}.enabled`, "false"]];

when("a repository that turns the hook off still gets the check", async () => {
  const commit = await world({ main: LINE }, OFF);
  const out = commit("Fix it.", CLAUDE);
  expect(out.code).not.toBe(0);
});

when(
  "a repository that turns the `commit-msg` event off still gets the check",
  async () => {
    const commit = await world({ main: LINE }, [
      ["hook.commit-msg.enabled", "false"],
    ]);
    const out = commit("Fix it.", CLAUDE);
    expect(out.code).not.toBe(0);
  },
);

when("a repository that turns off both still gets the check", async () => {
  const commit = await world({ main: LINE }, [
    ...OFF,
    ["hook.commit-msg.enabled", "false"],
  ]);
  const out = commit("Fix it.", CLAUDE);
  expect(out.code).not.toBe(0);
});

when(
  "a second `command` value of the repository does not replace the hook",
  async () => {
    const commit = await world({ main: LINE }, [
      [`hook.${HOOK_NAME}.command`, "true"],
    ]);
    const out = commit("Fix it.", CLAUDE);
    expect(out.code).not.toBe(0);
  },
);

when(
  "a repository that moves the hook to another event does not remove it",
  async () => {
    const commit = await world({ main: LINE }, [
      [`hook.${HOOK_NAME}.event`, "post-commit"],
    ]);
    const out = commit("Fix it.", CLAUDE);
    expect(out.code).not.toBe(0);
  },
);
