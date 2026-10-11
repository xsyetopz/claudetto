// The drift check (task 13.3): the pure rules and the pins of its copies.
// The lab test `plugins/dotclaude/tests/drift.test.ts` runs the `session.start` handler.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
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
  snippetGaps,
  staleStatusLines,
  syncedSkills,
  unknownSections,
} from "../../plugins/dotclaude/features/drift/rules.mjs";
import { snippetFor } from "../../plugins/dotclaude/lib/merge.mjs";
import { REPO } from "../support/repo.mjs";

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
      path.join(REPO, "schemas/claude-code-settings.json"),
      "utf8",
    ),
  );
  assert.equal(schema.$comment, `Extracted from Claude Code ${TESTED_VERSION}`);
});

test("the override variables are the two that beat the agent files", () => {
  assert.deepEqual(
    [...OVERRIDE_ENV],
    ["CLAUDE_CODE_EFFORT_LEVEL", "CLAUDE_CODE_SUBAGENT_MODEL_FORCE"],
  );
});

test("the profile itself gives no line", () => {
  assert.deepEqual(driftLines(settled), []);
  assert.equal(driftNote([]), undefined);
});

test("a fact that the caller could not read gives no line", () => {
  assert.deepEqual(driftLines({}), []);
});

test("each rule finds its difference", () => {
  assert.deepEqual(
    pluginsOn({ enabledPlugins: { [OFF_PLUGINS[0]]: false } }),
    OFF_PLUGINS.slice(1),
  );
  assert.deepEqual(
    syncedSkills([{ name: "a", source: "syncedSkills" }, { name: "b" }]),
    ["a"],
  );
  assert.deepEqual(
    unknownSections([{ id: "lean_body" }, { id: "x:y" }, { id: "new_one" }]),
    ["new_one"],
  );
  assert.equal(isSeated({}), false);
  assert.equal(isSeated({ model: "x" }), true);
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
  assert.equal(lines.length, 6);
  assert.equal(new Set(lines).size, 6);
  const note = driftNote(lines);
  assert.equal(note.split("\n").filter((l) => l.startsWith("- ")).length, 6);
});

test("the snippet gaps skip a superset of `availableModels`, the built-in plugins, and a status line of another tool", () => {
  const root = "/plugins/dotclaude";
  const full = snippetFor({}, root);
  const settings = {
    ...full,
    availableModels: [
      ...full.availableModels,
      "x-model",
      full.availableModels[0],
    ],
    enabledPlugins: {},
    statusLine: { type: "command", command: "ccstatusline" },
  };
  assert.deepEqual(snippetGaps(settings, root), []);
  assert.deepEqual(staleStatusLines(settings, root), []);
  assert.deepEqual(
    snippetGaps({ ...full, availableModels: ["claude-opus-5-5"] }, root),
    ["availableModels"],
  );
});

test("a 0.27.0 launcher stub in the status line is stale", () => {
  const root = "/plugins/dotclaude";
  const settings = {
    ...snippetFor({}, root),
    statusLine: {
      type: "command",
      command: 'node "/u/.claude/dotclaude/statusline.mjs"',
    },
  };
  assert.deepEqual(staleStatusLines(settings, root), ["statusLine.command"]);
});
