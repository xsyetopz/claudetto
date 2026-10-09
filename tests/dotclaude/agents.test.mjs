// The agent files of the core plugin: the roster of five and the description bound.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { AGENT_DESCRIPTION_MAX_CHARS } from "../../tools/limits.mjs";

const DIR = path.join(import.meta.dirname, "../../plugins/dotclaude/agents");
const ROSTER = [
  "debugger",
  "implementer",
  "investigator",
  "reviewer",
  "test-runner",
];
const frontMatter = (text) =>
  Object.fromEntries(
    text
      .split("\n---")[0]
      .split("\n")
      .slice(1)
      .map((line) => line.match(/^([\w-]+):\s*(.*)$/))
      .filter(Boolean)
      .map(([, key, value]) => [key, value]),
  );
const agents = () =>
  fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => {
      const text = fs.readFileSync(path.join(DIR, f), "utf8");
      return {
        file: f,
        name: f.replace(/\.md$/, ""),
        text,
        fm: frontMatter(text),
      };
    });

/** The names of the agents whose description is over `max` characters. */
const tooLong = (list, max = AGENT_DESCRIPTION_MAX_CHARS) =>
  list.filter((a) => a.fm.description.length > max).map((a) => a.name);

test("the agent files are the five agents of the roster, and no other", () => {
  expect(agents().map((a) => a.name)).toEqual(ROSTER);
  for (const a of agents()) expect(a.fm.name).toBe(a.name);
});

test("no description is over the bound, and a 301-character fixture fails", () => {
  expect(AGENT_DESCRIPTION_MAX_CHARS).toBe(300);
  expect(tooLong(agents())).toEqual([]);
  const fixture = [
    { name: "ok", fm: { description: "x".repeat(300) } },
    { name: "long", fm: { description: "x".repeat(301) } },
  ];
  expect(tooLong(fixture)).toEqual(["long"]);
});
