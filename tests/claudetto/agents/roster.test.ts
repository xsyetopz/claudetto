// The scenarios of spec `agent-roster` that a file check can test (task 4.1 of change `0-3-0`).

import { expect, test } from "bun:test";
import { SNIPPET } from "../../../plugins/claudetto/snippets.ts";
import { front, ROSTER, tools } from "../../support/agents.ts";

const TOOLS = new Set([
  "Read",
  "Grep",
  "Glob",
  "Edit",
  "Write",
  "Bash",
  "Monitor",
  "WebSearch",
  "WebFetch",
]);

test("Fixed Agent Settings: each agent sets `model`, `effort`, `tools`, and `omitClaudeMd`", async () => {
  for (const name of ROSTER) {
    const fm = await front(name);
    expect(fm, name).toMatchObject({ name, omitClaudeMd: true });
    expect(String(fm?.["model"]), name).toMatch(/^claude-(haiku|sonnet)-/);
    expect(["low", "medium", "high"], name).toContain(String(fm?.["effort"]));
    expect(String(fm?.["description"]), name).not.toContain("\n");
    for (const tool of await tools(name))
      expect(TOOLS, `${name}: ${tool}`).toContain(tool);
  }
});

test("Read-Only Agent: `scout` and `reviewer` cannot edit, write, or start an agent", async () => {
  for (const name of ["scout", "reviewer"])
    for (const tool of ["Edit", "Write", "Agent"])
      expect(await tools(name), name).not.toContain(tool);
});

test("Effort Is Not Forced: the snippet sets no env var that overrides the agents", () => {
  const keys = Object.keys(SNIPPET.env);
  expect(keys).not.toContain("CLAUDE_CODE_EFFORT_LEVEL");
  expect(keys).not.toContain("CLAUDE_CODE_SUBAGENT_MODEL_FORCE");
});
