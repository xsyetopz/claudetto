// Lab tests of the `guard` hooks on each tool (spec `permission-gate`, "Allow by Default", D1).
// Probe of task 2.5: in the lab, `$.tool.call` with a stubbed `tool.call` skips each permission check, and with no stub it has no tool to run,
// so these tests query `tool.check` and `classic.PermissionRequest` directly, and the `just sandbox` session of task 11.4 checks the prompt path.
// The file is self-contained, because the lab runs it from `tests/` of the plugin, where it cannot import a relative file.

import type { On, ToolCheckArgs } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

/** An engine that asks for each call, as for a path outside the project, with no `git` repository. */
const stub = (on: On, below: object = {}) => {
  on("tool.check", () => ({ decision: "ask" }));
  on("classic.PermissionRequest", () => below);
  on("session.cwd", () => ({ value: "/p" }));
  mock.env(on, { HOME: "/u", TMPDIR: "/t" });
};

const both = async ($: Engine, tool: string, input: object) => ({
  check: (await $.tool.check({ tool, input } as ToolCheckArgs)).decision,
  request: (
    await $.classic.PermissionRequest({
      tool_name: tool,
      tool_input: input,
      agent_id: "a1",
      agent_type: "claudetto:Worker",
    } as never)
  ).decision,
});

const ALLOWED = [
  ["Monitor", { command: "tail -f /tmp/a.log | grep --line-buffered FAIL" }],
  ["mcp__plugin_cc-inspect_cc-inspect__search_binary", { q: "x" }],
  ["WebFetch", { url: "https://example.com", prompt: "x" }],
  ["Read", { file_path: "/private/tmp/a.log" }],
  ["Bash", { command: 'ls "$TMPDIR" && echo $HOME' }],
  ["Skill", { skill: "claudetto:dedupe" }],
  // The `dedupe` skill: the env prefix moves the cache of Bun to the temp folder of the sandbox.
  [
    "Bash",
    {
      command:
        'BUN_TMPDIR="$TMPDIR" BUN_INSTALL="$TMPDIR/bun" bunx jscpd -c "/c/skills/dedupe/jscpd.json" src',
    },
  ],
] as const;

test("Allow by Default: Monitor on a Temp Log, MCP Call, Web Fetch, Read Outside the Project, and a shell variable in a subagent allow, with no saved rule", async ($: Engine, on: On) => {
  stub(on);
  for (const [tool, input] of ALLOWED)
    expect([tool, await both($, tool, input)]).toStrictEqual([
      tool,
      { check: "allow", request: { behavior: "allow" } },
    ]);
});

test("Gate Matches: an `ask` of claudetto stays a prompt, and `classic.PermissionRequest` gives no decision", async ($: Engine, on: On) => {
  stub(on);
  for (const input of [
    { command: "terraform destroy" },
    { command: "git push --force" },
  ])
    expect(await both($, "Monitor", input)).toStrictEqual({
      check: "ask",
      request: undefined,
    });
});

test("a decision of a hook below stays", async ($: Engine, on: On) => {
  stub(on, { decision: { behavior: "deny", message: "user hook" } });
  expect(
    (await both($, "Read", { file_path: "/tmp/x" })).request,
  ).toStrictEqual({ behavior: "deny", message: "user hook" });
});
