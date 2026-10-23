// Lab tests of the `prompt.context` hook of the `prompt` slice: the `context_management` block of the compaction gate.
// The hook under test sits above the stub of the engine, so the stub answers `next(e)`.

import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";
import { ran } from "./stubs/process.ts";

const PROFILE = { options: { compaction: "built-in" } };

const ENGINE_BLOCKS = [{ name: "currentDate", text: "2026-10-22" }];

const contextBlocks = async (
  $: Engine,
  on: On,
  env: Record<string, string>,
) => {
  on("prompt.context", () => ({ blocks: ENGINE_BLOCKS }));
  mock.env(on, env);
  return (await $.prompt.context({ blocks: ENGINE_BLOCKS })).blocks;
};

const contextText = async ($: Engine, on: On, env: Record<string, string>) =>
  (await contextBlocks($, on, env)).find((b) => b.name === "context_management")
    ?.text;

test("with the handoff on, the `context_management` block says that a handoff carries the work", async ($: Engine, on: On) => {
  expect(await contextText($, on, {})).toContain("a handoff file carries");
});

test("with `DISABLE_COMPACT`, the `context_management` block says that compaction is off", async ($: Engine, on: On) => {
  const text = await contextText($, on, { DISABLE_COMPACT: "1" });
  expect(text).toContain("Compaction is off.");
  expect(text).not.toContain("summarizes");
});

test(
  "with the compaction profile, the `context_management` block says that Claude Code summarizes the context",
  PROFILE,
  async ($: Engine, on: On) => {
    const text = await contextText($, on, {});
    expect(text).toContain("summarizes");
    expect(text).not.toContain("handoff");
  },
);

test("the other blocks of the context stay", async ($: Engine, on: On) => {
  const blocks = await contextBlocks($, on, {});
  expect(blocks.map((b) => b.name)).toEqual([
    "currentDate",
    "context_management",
  ]);
  expect(blocks[0]?.text).toBe("2026-10-22");
});

/** The blocks of the context on a host whose `uname -s` prints `platform` and whose `SHELL` is `shell`. */
const hostBlocks = async (
  $: Engine,
  on: On,
  platform: string,
  shell: string,
) => {
  on("process.run", () => ran(`${platform}\n`));
  return contextBlocks($, on, { SHELL: shell });
};

test("on macOS with zsh, the `shell` block names the missing `timeout` and the zsh glob error", async ($: Engine, on: On) => {
  const text = (await hostBlocks($, on, "Darwin", "/bin/zsh")).find(
    (b) => b.name === "shell",
  )?.text;
  expect(text).toContain("`timeout`");
  expect(text).toContain("no matches found");
});

const planText = async ($: Engine, on: On) =>
  (await contextBlocks($, on, {})).find((b) => b.name === "plan")?.text;

test(
  "Max 20x: the context says that the login is a Max 20x subscription",
  { options: { plan: "default_claude_max_20x" } },
  async ($: Engine, on: On) => {
    const text = await planText($, on);
    expect(text).toContain("Max 20x subscription");
    expect(text).toContain("share of the plan limits, not as dollars");
  },
);

test("API Key: the context has no plan line", async ($: Engine, on: On) => {
  expect(await planText($, on)).toBeUndefined();
});

test(
  "No Identity: the plan line holds no email, name, or UUID",
  { options: { plan: "default_claude_max_20x" } },
  async ($: Engine, on: On) => {
    const text = (await planText($, on)) ?? "";
    expect(text).not.toMatch(/@|[0-9a-f]{8}-[0-9a-f]{4}-/i);
    expect(text).toBe(
      "The login is a Max 20x subscription. Speak of usage as a share of the plan limits, not as dollars.",
    );
  },
);

const NATIVE = "/Users/u/.local/share/claude/versions/2.1.309";

/** The text of the `repo` block on a host with the branch `main`, the tag `claudetto--v0.3.0-alpha.1`, the open change `release-0-3-0-alpha-2`, and the tools `tools`. */
const repoText = async (
  $: Engine,
  on: On,
  env: Record<string, string>,
  tools: string[],
) => {
  on("session.cwd", () => ({ value: "/p" }));
  on("tool.list", () => ({
    value: tools.map((name) => ({ name, description: "", mcp: false })),
  }));
  on("process.run", (_$, e) => {
    const stdout =
      e.argv[1] === "branch" ? "main\n" : "claudetto--v0.3.0-alpha.1\n";
    return ran(stdout);
  });
  on("fs.list", () => ({
    value: [
      { name: "archive", kind: "dir", size: 0, mtimeMs: 0, isLink: false },
      {
        name: "release-0-3-0-alpha-2",
        kind: "dir",
        size: 0,
        mtimeMs: 0,
        isLink: false,
      },
    ],
  }));
  on("fs.read", () => ({ value: "- [x] 1.1 a\n- [ ] 1.2 b\n" }));
  return (await contextBlocks($, on, { SHELL: "/bin/zsh", ...env })).find(
    (b) => b.name === "repo",
  )?.text;
};

const FACTS = [
  "Branch: main",
  "Latest tag: claudetto--v0.3.0-alpha.1",
  "Open change: release-0-3-0-alpha-2, next task 1.2",
  "Shell: zsh",
];

test("the `repo` block names the branch, the latest tag, the open change, the shell, and `ugrep` on a native build with `Grep` and `Glob` off", async ($: Engine, on: On) => {
  const text = await repoText($, on, { CLAUDE_CODE_EXECPATH: NATIVE }, [
    "Bash",
  ]);
  expect(text).toBe(
    [
      ...FACTS,
      "In `Bash`, `grep` is `ugrep`, which skips ignored files and VCS folders.",
    ].join("\n"),
  );
});

test("the `repo` block names the system `grep` when `Grep` is on", async ($: Engine, on: On) => {
  const system = [...FACTS, "In `Bash`, `grep` is the system `grep`."].join(
    "\n",
  );
  expect(
    await repoText($, on, { CLAUDE_CODE_EXECPATH: NATIVE }, ["Bash", "Grep"]),
  ).toBe(system);
});

test("the `repo` block names the system `grep` for the entry point `local-agent`", async ($: Engine, on: On) => {
  const env = {
    CLAUDE_CODE_EXECPATH: NATIVE,
    CLAUDE_CODE_ENTRYPOINT: "local-agent",
  };
  expect(await repoText($, on, env, ["Bash"])).toContain("system `grep`");
});

test("the `repo` block names the system `grep` when the engine runs on `node`", async ($: Engine, on: On) => {
  const env = { CLAUDE_CODE_EXECPATH: "/usr/local/bin/node" };
  expect(await repoText($, on, env, ["Bash"])).toContain("system `grep`");
});

test("on Linux with bash, the context has no `shell` block", async ($: Engine, on: On) => {
  const blocks = await hostBlocks($, on, "Linux", "/bin/bash");
  expect(blocks.map((b) => b.name)).toEqual([
    "currentDate",
    "context_management",
  ]);
});
