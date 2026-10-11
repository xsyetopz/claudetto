// The agent files of the core plugin: the roster of five, the description bound, and the `model` and `effort` of the frontmatter.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { SUBAGENT_EFFORTS } from "../../plugins/dotclaude/features/statusline/limits.mjs";
import { AGENT_DESCRIPTION_MAX_CHARS } from "../../tools/limits.mjs";
import { PLUGINS } from "../support/repo.mjs";

const DIR = path.join(PLUGINS, "dotclaude/agents");
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
  assert.deepEqual(
    agents().map((a) => a.name),
    ROSTER,
  );
  for (const a of agents()) assert.equal(a.fm.name, a.name);
});

test("no description is over the bound, and a 301-character fixture fails", () => {
  assert.equal(AGENT_DESCRIPTION_MAX_CHARS, 300);
  assert.deepEqual(tooLong(agents()), []);
  const fixture = [
    { name: "ok", fm: { description: "x".repeat(300) } },
    { name: "long", fm: { description: "x".repeat(301) } },
  ];
  assert.deepEqual(tooLong(fixture), ["long"]);
});

test("each agent file sets a roster `model` and an `effort` that the model takes, never `max`", () => {
  for (const a of agents()) {
    const list = SUBAGENT_EFFORTS[a.fm.model?.replace(/^claude-/, "")];
    assert.notEqual(list, undefined, a.name);
    assert.ok(list.includes(a.fm.effort), a.name);
    assert.notEqual(a.fm.effort, "max", a.name);
  }
});
