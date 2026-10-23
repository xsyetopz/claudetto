// The scenarios of spec `agent-roster` that a file check can test (task 4.1 of change `0-3-0`).

import { expect, test } from "bun:test";
import fs from "node:fs";
import { SNIPPET } from "../../../plugins/claudetto/snippets.ts";
import { AGENTS, front, ROSTER, tools } from "../../support/agents.ts";

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

test("Read-Only Agent: each agent but `Worker` cannot edit, write, or start an agent", async () => {
  for (const name of ROSTER.filter((n) => n !== "Worker"))
    for (const tool of ["Edit", "Write", "Agent"])
      expect(await tools(name), name).not.toContain(tool);
});

test("Reviewer Effort: `Reviewer` has Sonnet 5.5 at `medium`", async () => {
  expect(await front("Reviewer")).toMatchObject({
    model: "claude-sonnet-5-5",
    effort: "medium",
  });
});

test("Haiku Work: only `Scout` and `Tester` run on Haiku 5.5, at `low`, with no web tool", async () => {
  const haiku: string[] = [];
  for (const name of ROSTER) {
    const fm = await front(name);
    if (!String(fm?.["model"]).startsWith("claude-haiku-")) continue;
    haiku.push(name);
    expect(fm?.["effort"], name).toBe("low");
    for (const tool of ["WebSearch", "WebFetch"])
      expect(await tools(name), name).not.toContain(tool);
  }
  expect(haiku.sort()).toStrictEqual(["Scout", "Tester"]);
});

test('Description: each description starts with "Use proactively"', async () => {
  for (const name of ROSTER)
    expect(String((await front(name))?.["description"]), name).toMatch(
      /^Use proactively/,
    );
});

test("Tagged Report: each agent ends its report with the tags that `main.md` reads", async () => {
  const main = await Bun.file(`${AGENTS}/main.md`).text();
  for (const tag of ["result", "changed", "checks", "blocks"]) {
    expect(main).toContain(`\`<${tag}>\``);
    for (const name of ROSTER)
      expect(await Bun.file(`${AGENTS}/${name}.md`).text(), name).toContain(
        `\`<${tag}>\``,
      );
  }
});

// `readdirSync` gives the case on disk, which a lookup on a case-insensitive disk hides.
test("UpperCase Names: the files of `agents/` are `main.md` and the 6 agents of D6", () => {
  expect(fs.readdirSync(AGENTS).sort()).toStrictEqual([
    "Researcher.md",
    "Reviewer.md",
    "Scoper.md",
    "Scout.md",
    "Tester.md",
    "Worker.md",
    "main.md",
  ]);
});

test("Effort Is Not Forced: the snippet sets no env var that overrides the agents", () => {
  const keys = Object.keys(SNIPPET.env);
  expect(keys).not.toContain("CLAUDE_CODE_EFFORT_LEVEL");
  expect(keys).not.toContain("CLAUDE_CODE_SUBAGENT_MODEL_FORCE");
});
