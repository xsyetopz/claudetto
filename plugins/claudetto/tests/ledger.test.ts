// Lab tests of the edit ledger (spec `session-hygiene`, "Edit Ledger").
// The ledger lives in `$.state`, so the tests see it only through the line that `classic.UserPromptSubmit` adds.
// The file is self-contained, because a lab test cannot import a relative file.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

/** Stubs the files: `read` answers the content that `files[path]` holds now. The two classic hooks stand for the settings hooks beneath. */
const files = (on: On, files: Record<string, string | null>) => {
  on("classic.UserPromptSubmit", () => ({}));
  on("classic.PostToolUse", () => ({}));
  on("fs.read", (_$, e) => {
    const text = files[e.path];
    return typeof text === "string" ? { value: text } : { deny: "ENOENT" };
  });
};

const edit = ($: Engine, path: string, agent?: { id: string; type: string }) =>
  $.classic.PostToolUse({
    tool_name: "Edit",
    tool_input: { file_path: path },
    tool_response: {},
    tool_use_id: "t1",
    ...(agent ? { agent_id: agent.id, agent_type: agent.type } : {}),
  });

const prompt = ($: Engine) => $.classic.UserPromptSubmit({ prompt: "go on" });

test("Mine: an edit that nothing else changes adds no line at the next turn", async ($: Engine, on: On) => {
  files(on, { "/proj/a.ts": "const a = 1;\n" });
  await edit($, "/proj/a.ts");
  expect((await prompt($)).additionalContext ?? []).toStrictEqual([]);
});

test("Changed After: a rewrite after the edit adds one line that names the file, and only one time", async ($: Engine, on: On) => {
  const held: Record<string, string | null> = {
    "/proj/a.ts": "const a = 1;\n",
  };
  files(on, held);
  await edit($, "/proj/a.ts");
  held["/proj/a.ts"] = "const a = 1\n";
  const lines = (await prompt($)).additionalContext ?? [];
  expect(lines.length).toBe(1);
  expect(lines[0]).toContain("`/proj/a.ts`");
  expect(lines[0]).toContain("The user or a tool changed");
  expect(lines[0]?.split("\n").length).toBe(1);
  expect((await prompt($)).additionalContext ?? []).toStrictEqual([]);
  held["/proj/a.ts"] = "const a = 2;\n";
  expect(((await prompt($)).additionalContext ?? []).length).toBe(1);
});

test("a file that the agent edited again is its own again", async ($: Engine, on: On) => {
  const held: Record<string, string | null> = { "/proj/a.ts": "one\n" };
  files(on, held);
  await edit($, "/proj/a.ts");
  held["/proj/a.ts"] = "two\n";
  await edit($, "/proj/a.ts");
  expect((await prompt($)).additionalContext ?? []).toStrictEqual([]);
});

test("the ledger holds the edits of a subagent, and the line names that agent", async ($: Engine, on: On) => {
  const held: Record<string, string | null> = { "/proj/b.ts": "one\n" };
  files(on, held);
  await edit($, "/proj/b.ts", { id: "sub1", type: "claudetto:worker" });
  held["/proj/b.ts"] = "two\n";
  const lines = (await prompt($)).additionalContext ?? [];
  expect(lines.length).toBe(1);
  expect(lines[0]).toContain("`claudetto:worker`");
});

test("a tool other than `Edit` and `Write` adds no entry", async ($: Engine, on: On) => {
  const held: Record<string, string | null> = { "/proj/a.ts": "one\n" };
  files(on, held);
  await $.classic.PostToolUse({
    tool_name: "Read",
    tool_input: { file_path: "/proj/a.ts" },
    tool_response: {},
    tool_use_id: "t2",
  });
  held["/proj/a.ts"] = "two\n";
  expect((await prompt($)).additionalContext ?? []).toStrictEqual([]);
});
