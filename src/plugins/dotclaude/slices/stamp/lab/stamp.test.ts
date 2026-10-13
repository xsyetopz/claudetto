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
const PARENT = "/parent/repo";
const MARKETPLACE = "/.claude-plugin/marketplace.json";
const CWD = "/work/app";
const TRANSCRIPT = `${CONFIG}/projects/-work-app/sess-1.jsonl`;

/**
 * The facts of one start: the manifest text, the install entry, the answer of `git`, and the top folder of its repo.
 * `repo` `root` is a dotclaude checkout, which holds `MARKETPLACE`. `repo` `parent` is a parent repo without it.
 */
type Facts = {
  manifest?: string;
  install?: { sha: string; installPath: "root" | "windows" | "elsewhere" };
  repo?: "root" | "parent";
  git: { exitCode: number; stdout: string };
  /** The text of the transcript of the session, when the file exists. */
  transcript?: string;
  /** The transcript exists, but `fs.read` rejects it, as it does for a file over 4 MiB. */
  oversized?: boolean;
};

/** The answer of one `process.run`. */
const gitRun = (exitCode: number, stdout: string) => ({
  value: {
    exitCode,
    stdout,
    stderr: "",
    isStdoutTruncated: false,
    isStderrTruncated: false,
  },
});

/** The `installed_plugins.json` of the stubs, with one entry for the plugin and its SHA. */
const installedJson = (installPath: string, gitCommitSha: string) =>
  JSON.stringify({
    version: 2,
    plugins: {
      "dotclaude@dotclaude": [{ scope: "user", installPath, gitCommitSha }],
    },
  });

/**
 * True when an `fs` call is on the transcript.
 * On Windows the engine gives a native path, such as `D:\cfg\projects\-work-app\sess-1.jsonl`, so the drive goes for the compare.
 * The root of the plugin keeps its drive, because it comes from the real path of the manifest.
 */
const isTranscript = (file: string): boolean =>
  file.replace(/^[A-Za-z]:/, "") === TRANSCRIPT;

/**
 * Stubs for one start. A path that the facts do not give fails to read, as `$.fs.read` rejects a missing file.
 * The root of the plugin is the part of the `plugin.json` path before `MANIFEST`.
 */
const stub = (on: On, facts: Facts) => {
  let root = "";
  const top = () => (facts.repo === "parent" ? PARENT : root);
  mock.env(on, { CLAUDE_CONFIG_DIR: CONFIG });
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  on("session.id", () => ({ value: "sess-1" }));
  on("session.cwd", () => ({ value: CWD }));
  on("fs.read", (_$, e) => {
    // On Windows the engine gives a native path, such as `D:\cfg\plugins\installed_plugins.json`.
    const file = e.path.replaceAll("\\", "/");
    if (facts.repo !== "parent" && file === `${root}${MARKETPLACE}`)
      return { value: "{}" };
    if (file.endsWith(MANIFEST)) {
      root = file.slice(0, -MANIFEST.length);
      if (facts.manifest === undefined) throw new Error(`no file at ${e.path}`);
      return { value: facts.manifest };
    }
    if (file.endsWith(INSTALLED) && facts.install) {
      const installPath = {
        root,
        windows: root.replaceAll("/", "\\"),
        elsewhere: ELSEWHERE,
      }[facts.install.installPath];
      return { value: installedJson(installPath, facts.install.sha) };
    }
    if (isTranscript(file) && facts.transcript !== undefined)
      return { value: facts.transcript };
    throw new Error(`no file at ${e.path}`);
  });
  on("fs.exists", (_$, e) => {
    const file = e.path.replaceAll("\\", "/");
    const present =
      isTranscript(file) &&
      (facts.transcript !== undefined || facts.oversized === true);
    return { value: present };
  });
  on("process.run", (_$, e) => {
    if (!e.argv.includes("rev-parse")) throw new Error(`no run of ${e.argv}`);
    const { exitCode, stdout } = facts.git;
    if (e.argv.includes("--show-toplevel"))
      return gitRun(exitCode, exitCode === 0 ? `${top()}\n` : "");
    return gitRun(exitCode, stdout);
  });
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

test("a parent repository that is not a dotclaude checkout records `unknown`", async ($: Engine, on: On) => {
  // The parent repo has a HEAD, so only the marketplace check keeps its SHA out of the record.
  const session = stub(on, {
    manifest: MANIFEST_1,
    repo: "parent",
    git: { exitCode: 0, stdout: "fedcba9\n" },
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

test("an install entry with Windows separators matches the root", async ($: Engine, on: On) => {
  const session = stub(on, {
    manifest: MANIFEST_1,
    install: { sha: FULL_SHA, installPath: "windows" },
    git: { exitCode: 0, stdout: "fedcba9\n" },
  });
  await start($);
  expect(records(session)).toMatchObject([
    { sha: "0123456", shaSource: "install" },
  ]);
});

/** A transcript line of a stamp row, as Claude Code keeps it: a `system` row whose `content` is the stamp text. */
const stampLine = (version: string, sha: string) =>
  JSON.stringify({
    type: "system",
    subtype: "informational",
    content: `dotclaude build stamp: ${JSON.stringify({
      version,
      sha,
      shaSource: "git",
      sessionId: "sess-1",
      at: "2026-10-13T00:00:00.000Z",
    })}`,
  });

/** The install record gives the SHA `0123456` for this build, and the manifest gives version `1.0.0`. */
const CURRENT = {
  manifest: MANIFEST_1,
  install: { sha: FULL_SHA, installPath: "root" as const },
  git: { exitCode: 0, stdout: "fedcba9\n" },
};

test("a session whose transcript holds no stamp row appends one", async ($: Engine, on: On) => {
  const session = stub(on, {
    ...CURRENT,
    transcript: `${JSON.stringify({ type: "user", message: { content: "hi" } })}\n`,
  });
  await start($);
  expect(records(session)).toMatchObject([
    { version: "1.0.0", sha: "0123456" },
  ]);
});

test("a resumed session whose newest stamp row has the same build appends no stamp", async ($: Engine, on: On) => {
  const session = stub(on, {
    ...CURRENT,
    transcript: [
      stampLine("1.0.0", "fedcba9"),
      stampLine("1.0.0", "0123456"),
    ].join("\n"),
  });
  await start($);
  expect(records(session)).toStrictEqual([]);
});

test("a resumed session whose newest stamp row has another build appends a stamp", async ($: Engine, on: On) => {
  const session = stub(on, {
    ...CURRENT,
    transcript: [
      stampLine("1.0.0", "0123456"),
      stampLine("1.0.0", "fedcba9"),
    ].join("\n"),
  });
  await start($);
  expect(records(session)).toMatchObject([
    { version: "1.0.0", sha: "0123456" },
  ]);
});

test("a resumed session whose transcript is over 4 MiB appends no stamp", async ($: Engine, on: On) => {
  // `fs.read` rejects the file, but `fs.exists` finds it, so its stamps cannot be read and no stamp is written.
  const session = stub(on, { ...CURRENT, oversized: true });
  await start($);
  expect(records(session)).toStrictEqual([]);
});

test("a new session with no transcript file appends a stamp", async ($: Engine, on: On) => {
  const session = stub(on, CURRENT);
  await start($);
  expect(records(session)).toMatchObject([
    { version: "1.0.0", sha: "0123456" },
  ]);
});
