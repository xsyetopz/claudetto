// Lab tests of the `session.start` stamp of the `stamp` slice: it appends the build of the session as a `system` notice.
// The stubs answer the reads of the module, and `mock.session` records the notice.
// The plugin root is not in the test engine, so the stubs take it from the path of `plugin.json` that the hook reads.
// The file is self-contained, because `just generate` copies it to `tests/` of the plugin, where it cannot import a relative file.

import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const FULL_SHA = "0123456789abcdef0123456789abcdef01234567";
const CONFIG = "/cfg";
const INSTALLED = `${CONFIG}/plugins/installed_plugins.json`;
const MANIFEST = "/.claude-plugin/plugin.json";
const ELSEWHERE = "/elsewhere/dotclaude";

/** The facts of one start: the manifest text, the install entry, and the answer of `git`. */
type Facts = {
  manifest?: string;
  install?: { sha: string; installPath: "root" | "elsewhere" };
  git: { exitCode: number; stdout: string };
};

/** The `installed_plugins.json` of the stubs, with one entry for the plugin and its SHA. */
const installedJson = (installPath: string, gitCommitSha: string) =>
  JSON.stringify({
    version: 2,
    plugins: {
      "dotclaude@dotclaude": [{ scope: "user", installPath, gitCommitSha }],
    },
  });

/**
 * Stubs for one start. A path that the facts do not give fails to read, as `$.fs.read` rejects a missing file.
 * The root of the plugin is the part of the `plugin.json` path before `MANIFEST`.
 */
const stub = (on: On, facts: Facts) => {
  let root = "";
  mock.env(on, { CLAUDE_CONFIG_DIR: CONFIG });
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  on("session.id", () => ({ value: "sess-1" }));
  on("fs.read", (_$, e) => {
    if (e.path.endsWith(MANIFEST)) {
      root = e.path.slice(0, -MANIFEST.length);
      if (facts.manifest === undefined) throw new Error(`no file at ${e.path}`);
      return { value: facts.manifest };
    }
    if (e.path === INSTALLED && facts.install) {
      const installPath =
        facts.install.installPath === "root" ? root : ELSEWHERE;
      return { value: installedJson(installPath, facts.install.sha) };
    }
    throw new Error(`no file at ${e.path}`);
  });
  on("process.run", () => ({ value: { ...facts.git, stderr: "" } }));
  // The other hooks of `session.start` read these, and a stub keeps their notes out of the record.
  on("settings.read", (_$, e) => ({
    value: e.source === "policy" ? {} : { syncClaudeAiSkills: false },
  }));
  on("session.version", () => ({ value: { version: "2.1.296" } }));
  on("session.turns", () => ({ value: 0 }));
  on("prompt.compose", () => ({ sections: [] }));
  on("tool.register", (_$, e) => ({
    value: { tool: `mcp__dotclaude__${e.name}` },
  }));
  return mock.session(on);
};

const start = ($: Engine) =>
  $.session.start({ cwd: "/work/app", surface: null, isInteractive: false });

/** The records of the stamp notices that the session appended. */
const records = (session: ReturnType<typeof mock.session>) =>
  session
    .appended()
    .filter((row) => row.message.type === "system")
    .map((row) => {
      const text = String(row.message.content[0]?.["text"]);
      return JSON.parse(text.slice(text.indexOf("{")));
    });

const MANIFEST_1 = JSON.stringify({ name: "dotclaude", version: "1.0.0" });

test("a session with an install entry for its root records the entry's SHA", async ($: Engine, on: On) => {
  const session = stub(on, {
    manifest: MANIFEST_1,
    install: { sha: FULL_SHA, installPath: "root" },
    git: { exitCode: 0, stdout: "fedcba9\n" },
  });
  await start($);
  expect(records(session)).toStrictEqual([
    {
      version: "1.0.0",
      sha: "0123456",
      shaSource: "install",
      sessionId: "sess-1",
      at: expect.any(String),
    },
  ]);
});

test("no install entry for the root takes the SHA from `git`", async ($: Engine, on: On) => {
  const session = stub(on, {
    manifest: MANIFEST_1,
    install: { sha: FULL_SHA, installPath: "elsewhere" },
    git: { exitCode: 0, stdout: "fedcba9\n" },
  });
  await start($);
  expect(records(session)).toMatchObject([
    { version: "1.0.0", sha: "fedcba9", shaSource: "git" },
  ]);
});

test("no install entry and no `git` repo records `unknown`", async ($: Engine, on: On) => {
  const session = stub(on, {
    manifest: MANIFEST_1,
    git: { exitCode: 128, stdout: "" },
  });
  await start($);
  expect(records(session)).toMatchObject([
    { version: "1.0.0", sha: "unknown", shaSource: "unknown" },
  ]);
});

test("a failed read of the install record takes the SHA from `git`", async ($: Engine, on: On) => {
  // The install record is not given, so its read fails, and the stamp takes the SHA from `git`.
  const session = stub(on, {
    manifest: MANIFEST_1,
    git: { exitCode: 0, stdout: "fedcba9\n" },
  });
  await start($);
  expect(records(session)).toMatchObject([
    { sha: "fedcba9", shaSource: "git" },
  ]);
});

test("a stamp that cannot read the manifest writes no notice and the session starts", async ($: Engine, on: On) => {
  const session = stub(on, {
    install: { sha: FULL_SHA, installPath: "root" },
    git: { exitCode: 0, stdout: "fedcba9\n" },
  });
  await expect(start($)).resolves.toBeDefined();
  expect(records(session)).toStrictEqual([]);
});
