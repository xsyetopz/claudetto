// The drift check (task 13.3): the pure rules and the pins of its copies.
// The lab test `plugins/dotclaude/tests/drift.test.ts` runs the `session.start` handler.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  OFF_PLUGINS,
  OVERRIDE_ENV,
  TESTED_VERSION,
} from "../../plugins/dotclaude/features/drift/data.mjs";
import {
  driftLines,
  driftNote,
  isSeated,
  pluginsOn,
  syncedSkills,
  unknownSections,
} from "../../plugins/dotclaude/features/drift/rules.mjs";

const ROOT = path.join(import.meta.dirname, "../..");
// Settings that turn off each plugin of `OFF_PLUGINS`, as the settings snippet of the wiki does.
const profile = {
  enabledPlugins: Object.fromEntries(OFF_PLUGINS.map((id) => [id, false])),
};
const settled = {
  settings: profile,
  policy: {},
  version: TESTED_VERSION,
  skills: [],
  sections: [],
};

test("the tested version is the version of the shipped schema", () => {
  const schema = JSON.parse(
    fs.readFileSync(
      path.join(import.meta.dirname, "../../schemas/claude-code-settings.json"),
      "utf8",
    ),
  );
  expect(schema.$comment).toBe(`Extracted from Claude Code ${TESTED_VERSION}`);
});

test("the override variables are the two that beat the agent files", () => {
  expect([...OVERRIDE_ENV]).toEqual([
    "CLAUDE_CODE_EFFORT_LEVEL",
    "CLAUDE_CODE_SUBAGENT_MODEL_FORCE",
  ]);
});

test("the profile itself gives no line", () => {
  expect(driftLines(settled)).toEqual([]);
  expect(driftNote([])).toBeUndefined();
});

test("a fact that the caller could not read gives no line", () => {
  expect(driftLines({})).toEqual([]);
});

test("each rule finds its difference", () => {
  expect(pluginsOn({ enabledPlugins: { [OFF_PLUGINS[0]]: false } })).toEqual(
    OFF_PLUGINS.slice(1),
  );
  expect(
    syncedSkills([{ name: "a", source: "syncedSkills" }, { name: "b" }]),
  ).toEqual(["a"]);
  expect(
    unknownSections([{ id: "lean_body" }, { id: "x:y" }, { id: "new_one" }]),
  ).toEqual(["new_one"]);
  expect(isSeated({})).toBe(false);
  expect(isSeated({ model: "x" })).toBe(true);
});

test("the note lists each line", () => {
  const lines = driftLines({
    ...settled,
    policy: { model: "x" },
    version: "2.1.1",
    sections: [{ id: "new_one" }],
    skills: [{ name: "a", source: "syncedSkills" }],
    settings: {},
    blocking: { CLAUDE_CODE_EFFORT_LEVEL: "low" },
  });
  expect(lines.length).toBe(6);
  expect(new Set(lines).size).toBe(6);
  const note = driftNote(lines);
  expect(note.split("\n").filter((l) => l.startsWith("- ")).length).toBe(6);
});
