// Tests of the agent files of the core plugin: the six agents of the table, their model, effort, and turn bound, and the tools that each may call.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  AGENT_NAMES,
  turnBound,
} from "../../../src/plugins/dotclaude/slices/agents/domain/turns.ts";
import { AGENT_DESCRIPTION_MAX_CHARS } from "../../../tools/limits.ts";
import { REPO } from "../../support/repo.ts";

const DIR = path.join(REPO, "src/plugins/dotclaude/slices/agents/agents");
const HAIKU = "claude-haiku-5-5";
const SONNET = "claude-sonnet-5-5";
const OPUS = "claude-opus-5-5";

/** The model and the effort of each agent of the table in `workflow.md`. */
const TABLE: Record<string, { model: string; effort: string }> = {
  debugger: { model: SONNET, effort: "high" },
  implementer: { model: SONNET, effort: "medium" },
  investigator: { model: HAIKU, effort: "medium" },
  planner: { model: OPUS, effort: "high" },
  researcher: { model: SONNET, effort: "medium" },
  reviewer: { model: OPUS, effort: "high" },
};

const frontMatter = (text: string): Record<string, string> =>
  Object.fromEntries(
    (text.split("\n---")[0] as string)
      .split("\n")
      .slice(1)
      .map((line) => line.match(/^([\w-]+):\s*(.*)$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => [m[1] as string, m[2] as string]),
  );

/** The names in a comma list of front matter, such as `tools: Bash, Read`. */
const names = (value: string | undefined): string[] =>
  value
    ? value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

const agents = () =>
  Promise.all(
    fs
      .readdirSync(DIR)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .map(async (f) => {
        const text = await Bun.file(path.join(DIR, f)).text();
        const fm = frontMatter(text);
        return {
          name: f.replace(/\.md$/, ""),
          fm,
          tools: names(fm["tools"]),
          disallowed: names(fm["disallowedTools"]),
        };
      }),
  );

/** True when the agent may call `tool`: it is in `tools` when `tools` is set, and not in `disallowedTools`. */
const mayCall = (
  a: { tools: string[]; disallowed: string[] },
  tool: string,
): boolean =>
  (a.tools.length === 0 || a.tools.includes(tool)) &&
  !a.disallowed.includes(tool);

test("the agent files are the six agents of the table, and no other", async () => {
  const list = await agents();
  expect(list.map((a) => a.name)).toStrictEqual(Object.keys(TABLE).sort());
  expect<string[]>([...AGENT_NAMES]).toStrictEqual(Object.keys(TABLE).sort());
  for (const a of list) expect(a.fm["name"], a.name).toBe(a.name);
});

test("each agent file has the model and the effort of the table", async () => {
  for (const a of await agents()) {
    expect(a.fm["model"], a.name).toBe(TABLE[a.name]?.model as string);
    expect(a.fm["effort"], a.name).toBe(TABLE[a.name]?.effort as string);
  }
});

test("each agent file has the turn bound of `domain/turns.ts` as its `maxTurns`", async () => {
  for (const a of await agents()) {
    expect(Number(a.fm["maxTurns"]), a.name).toBe(
      turnBound(a.name as (typeof AGENT_NAMES)[number]),
    );
  }
});

test("the read-only agents cannot write or edit, and the others can", async () => {
  const byName = Object.fromEntries((await agents()).map((a) => [a.name, a]));
  for (const name of ["investigator", "researcher", "reviewer"]) {
    const a = byName[name] as Parameters<typeof mayCall>[0];
    for (const tool of ["Write", "Edit", "NotebookEdit"])
      expect(mayCall(a, tool), `${name} ${tool}`).toBe(false);
  }
  for (const name of ["debugger", "implementer", "planner"]) {
    const a = byName[name] as Parameters<typeof mayCall>[0];
    expect(mayCall(a, "Write"), `${name} Write`).toBe(true);
    expect(mayCall(a, "Edit"), `${name} Edit`).toBe(true);
  }
});

test("the implementer and the debugger cannot spawn an agent, and the others cannot either", async () => {
  for (const a of await agents()) {
    expect(mayCall(a, "Agent"), a.name).toBe(false);
  }
});

test("only `researcher` may use the web, and `investigator` may not", async () => {
  const byName = Object.fromEntries((await agents()).map((a) => [a.name, a]));
  for (const tool of ["WebFetch", "WebSearch"]) {
    expect(
      mayCall(byName["researcher"] as Parameters<typeof mayCall>[0], tool),
      tool,
    ).toBe(true);
    expect(
      mayCall(byName["investigator"] as Parameters<typeof mayCall>[0], tool),
      tool,
    ).toBe(false);
  }
});

test("no description is over the repository bound", async () => {
  for (const a of await agents()) {
    expect(
      (a.fm["description"] as string).length <= AGENT_DESCRIPTION_MAX_CHARS,
      a.name,
    ).toBe(true);
  }
});
