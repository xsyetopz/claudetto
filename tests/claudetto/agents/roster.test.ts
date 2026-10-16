// Tests of the agent files of the core plugin: the six agents of the table, their model and effort, and the tools that each may call.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { slice } from "../../../plugins/claudetto/slices/agents/slice.ts";
import { AGENT_DESCRIPTION_MAX_CHARS } from "../../../tools/limits.ts";
import { REPO } from "../../support/repo.ts";

const DIR = path.join(REPO, "src/plugins/claudetto/slices/agents/agents");
const HAIKU = "claude-haiku-5-5";
const OPUS = "claude-opus-5-5";

/** The model and the effort of each agent, from the table of D7 in `design.md`. */
const TABLE: Record<string, { model: string; effort: string }> = {
  debugger: { model: OPUS, effort: "medium" },
  implementer: { model: HAIKU, effort: "xhigh" },
  investigator: { model: HAIKU, effort: "xhigh" },
  planner: { model: HAIKU, effort: "xhigh" },
  researcher: { model: HAIKU, effort: "xhigh" },
  reviewer: { model: OPUS, effort: "medium" },
};

/** The roles whose effort the user set apart from the sweep (the user, 2026-10-16). */
const USER_EFFORT = new Set(["debugger", "reviewer"]);

/** The efforts that no Opus agent may have. */
const OPUS_EFFORT_BANNED = ["xhigh", "max"];

/** The fault of an agent with `model` and `effort`, or none. */
const effortFault = (model: string, effort: string): string | null =>
  model.includes("opus") && OPUS_EFFORT_BANNED.includes(effort)
    ? `an Opus agent has the effort ${effort}`
    : null;

/** The tools of Claude Code that a prompt can name in inline code. */
const TOOLS = [
  "Agent",
  "AskUserQuestion",
  "Bash",
  "Edit",
  "EnterWorktree",
  "ExitWorktree",
  "Glob",
  "Grep",
  "NotebookEdit",
  "Read",
  "WebFetch",
  "WebSearch",
  "Write",
];

const FRAGMENTS = path.join(REPO, "src/fragments");
const fragments: Record<string, string> = Object.fromEntries(
  await Promise.all(
    [...new Bun.Glob("*.md").scanSync(FRAGMENTS)].map(
      async (f) =>
        [
          f.slice(0, -3),
          await Bun.file(path.join(FRAGMENTS, f)).text(),
        ] as const,
    ),
  ),
);

/** The text of an agent file with each `{{include name}}` line replaced by its fragment. */
const expanded = (text: string): string =>
  text.replace(
    /^\{\{include ([a-z0-9-]+)\}\}$/gm,
    (_m, name: string) => fragments[name] ?? "",
  );

/** The tools that a text names in inline code. */
const namedTools = (text: string): string[] =>
  TOOLS.filter((tool) => text.includes(`\`${tool}\``));

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
          text,
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
  expect([...(slice.agents ?? [])].sort()).toStrictEqual(
    Object.keys(TABLE).sort(),
  );
  for (const a of list) expect(a.fm["name"], a.name).toBe(a.name);
});

test("each agent file has the model and the effort of the table", async () => {
  for (const a of await agents()) {
    expect(a.fm["model"], a.name).toBe(TABLE[a.name]?.model as string);
    expect(a.fm["effort"], a.name).toBe(TABLE[a.name]?.effort as string);
  }
});

test("no Opus agent has the effort `xhigh` or `max`", async () => {
  for (const a of await agents())
    expect(
      effortFault(a.fm["model"] as string, a.fm["effort"] as string),
      a.name,
    ).toBeNull();
});

test("the effort check fails an Opus agent with `xhigh` or `max`, and passes the other settings", () => {
  expect(effortFault(OPUS, "xhigh")).not.toBeNull();
  expect(effortFault(OPUS, "max")).not.toBeNull();
  expect(effortFault(OPUS, "high")).toBeNull();
  expect(effortFault(HAIKU, "xhigh")).toBeNull();
});

// The results file is in `external/`, which git ignores, so this test runs only where the file is.
const RESULTS = path.join(REPO, "external/sdd/eval/results-big-sweep.md");
test.skipIf(!fs.existsSync(RESULTS))(
  "the results file of the sweep names the setting of each role",
  async () => {
    const text = await Bun.file(RESULTS).text();
    for (const [role, { model, effort }] of Object.entries(TABLE)) {
      const row = text
        .split("\n")
        .find((l) => l.startsWith("|") && l.includes(`\`${role}\``));
      expect(row, role).toBeTruthy();
      expect(row?.toLowerCase(), role).toContain(
        model.replace(/^claude-/, "").split("-")[0] as string,
      );
      if (!USER_EFFORT.has(role)) expect(row, role).toContain(effort);
    }
  },
);

test("each tool that an agent prompt or fragment names is in the `tools` of its frontmatter", async () => {
  for (const a of await agents()) {
    expect(a.tools.length > 0, `${a.name} has no tools list`).toBe(true);
    for (const tool of namedTools(expanded(a.text)))
      expect(a.tools, `${a.name} names ${tool}`).toContain(tool);
  }
});

test("no agent has `Agent` or `AskUserQuestion` in its `tools`", async () => {
  for (const a of await agents())
    for (const tool of ["Agent", "AskUserQuestion"])
      expect(a.tools, a.name).not.toContain(tool);
});

test("the planner writes only in the change folder of MiniSpec", async () => {
  const planner = (await agents()).find((a) => a.name === "planner");
  expect(planner?.text).toContain("minispec/changes/<name>/");
  expect(planner?.text).not.toContain(".claudetto/spec");
});

test("no agent file has a `maxTurns`, because a run at its turn limit returns no report", async () => {
  for (const a of await agents())
    expect(a.fm, a.name).not.toHaveProperty("maxTurns");
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
