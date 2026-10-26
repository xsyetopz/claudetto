// Lab tests of the `prompt.context` hook of the `prompt` slice: the `context_management` block of the compaction gate.
// The hook under test sits above the stub of the engine, so the stub answers `next(e)`.

import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";
import { ran } from "./stubs/process.ts";

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

test("on macOS with zsh, the context has a `shell` block", async ($: Engine, on: On) => {
  const blocks = await hostBlocks($, on, "Darwin", "/bin/zsh");
  expect(blocks.map((b) => b.name)).toContain("shell");
});

const planText = async ($: Engine, on: On) =>
  (await contextBlocks($, on, {})).find((b) => b.name === "plan")?.text;

test(
  "Max 20x: the plan block names the tier",
  { options: { plan: "default_claude_max_20x" } },
  async ($: Engine, on: On) => {
    const text = await planText($, on);
    expect(text).toContain("Max 20x");
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

for (const [tools, ugrep] of [
  [["Bash"], true],
  [["Bash", "Grep"], false],
] as const)
  test(`the \`repo\` block names the branch, the latest tag, the open change, the shell, and ${ugrep ? "`ugrep`" : "the system `grep`"} with the tools ${tools.join(", ")} on a native build`, async ($: Engine, on: On) => {
    const text = await repoText($, on, { CLAUDE_CODE_EXECPATH: NATIVE }, [
      ...tools,
    ]);
    const lines = (text ?? "").split("\n");
    expect(lines.slice(0, FACTS.length)).toStrictEqual(FACTS);
    expect(lines).toHaveLength(FACTS.length + 1);
    expect(lines[FACTS.length]?.includes("ugrep")).toBe(ugrep);
  });

test("the `repo` block names the system `grep` for the entry point `local-agent`", async ($: Engine, on: On) => {
  const env = {
    CLAUDE_CODE_EXECPATH: NATIVE,
    CLAUDE_CODE_ENTRYPOINT: "local-agent",
  };
  expect(await repoText($, on, env, ["Bash"])).not.toContain("ugrep");
});

test("the `repo` block names the system `grep` when the engine runs on `node`", async ($: Engine, on: On) => {
  const env = { CLAUDE_CODE_EXECPATH: "/usr/local/bin/node" };
  expect(await repoText($, on, env, ["Bash"])).not.toContain("ugrep");
});

test("on Linux with bash, the context has no `shell` block", async ($: Engine, on: On) => {
  const blocks = await hostBlocks($, on, "Linux", "/bin/bash");
  expect(blocks.map((b) => b.name)).toEqual([
    "currentDate",
    "context_management",
  ]);
});
