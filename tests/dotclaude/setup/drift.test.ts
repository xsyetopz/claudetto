// The drift check (task 13.3): the pure rules and the pins of its copies.
// The lab test `plugins/dotclaude/tests/drift.test.ts` runs the `session.start` handler.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { driftCommand } from "../../../plugins/dotclaude/slices/setup/adapters/drift-cmd.ts";
import { planAutoMode } from "../../../plugins/dotclaude/slices/setup/domain/automode.ts";
import {
  driftLines,
  driftNote,
  isSeated,
  pluginsOn,
  snippetGaps,
  staleStatusLines,
  syncedSkills,
  unknownSections,
} from "../../../plugins/dotclaude/slices/setup/domain/drift.ts";
import {
  OFF_PLUGINS,
  OVERRIDE_ENV,
  TESTED_VERSION,
} from "../../../plugins/dotclaude/slices/setup/domain/facts.ts";
import { snippetFor } from "../../../plugins/dotclaude/slices/setup/domain/merge.ts";
import { REPO, tmpDir } from "../../support/repo.ts";

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

test("the tested version is the version of the shipped schema", async () => {
  const schema = JSON.parse(
    await Bun.file(path.join(REPO, "schemas/claude-code-settings.json")).text(),
  );
  expect(schema.$comment).toBe(`Extracted from Claude Code ${TESTED_VERSION}`);
});

test("the override variables are the two that beat the agent files", () => {
  expect([...OVERRIDE_ENV]).toStrictEqual([
    "CLAUDE_CODE_EFFORT_LEVEL",
    "CLAUDE_CODE_SUBAGENT_MODEL_FORCE",
  ]);
});

test("the profile itself gives no line", () => {
  expect(driftLines(settled)).toStrictEqual([]);
  expect(driftNote([])).toBe(undefined);
});

test("a fact that the caller could not read gives no line", () => {
  expect(driftLines({})).toStrictEqual([]);
});

test("each rule finds its difference", () => {
  expect(
    pluginsOn({ enabledPlugins: { [OFF_PLUGINS[0] as string]: false } }),
  ).toStrictEqual(OFF_PLUGINS.slice(1));
  expect(
    syncedSkills([
      { name: "a", source: "syncedSkills", tokens: 0 },
      { name: "b", source: "plugin", tokens: 0 },
    ]),
  ).toStrictEqual(["a"]);
  expect(
    unknownSections([
      { id: "lean_body", text: "", scope: "shared" },
      { id: "x:y", text: "", scope: "shared" },
      { id: "new_one", text: "", scope: "shared" },
    ]),
  ).toStrictEqual(["new_one"]);
  expect(isSeated({})).toBe(false);
  expect(isSeated({ model: "x" })).toBe(true);
});

test("the note lists each line", () => {
  const lines = driftLines({
    ...settled,
    policy: { model: "x" },
    version: "2.1.1",
    sections: [{ id: "new_one", text: "new", scope: "session" }],
    skills: [{ name: "a", source: "syncedSkills", tokens: 0 }],
    settings: {},
    blocking: { CLAUDE_CODE_EFFORT_LEVEL: "low" },
  });
  expect(lines.length).toBe(6);
  expect(new Set(lines).size).toBe(6);
  const note = driftNote(lines);
  expect(
    (note as string).split("\n").filter((l) => l.startsWith("- ")).length,
  ).toBe(6);
});

test("the snippet gaps skip a superset of `availableModels`, the built-in plugins, and a status line of another tool", () => {
  const root = "/plugins/dotclaude";
  const full = { ...snippetFor({}, root), ...planAutoMode({}, []) };
  const models = full["availableModels"] as string[];
  const settings = {
    ...full,
    availableModels: [...models, "x-model", models[0] as string],
    enabledPlugins: {},
    statusLine: { type: "command", command: "ccstatusline" },
  };
  expect(snippetGaps(settings, root)).toStrictEqual([]);
  expect(staleStatusLines(settings, root)).toStrictEqual([]);
  expect(
    snippetGaps({ ...full, availableModels: ["claude-opus-5-5"] }, root),
  ).toStrictEqual(["availableModels"]);
});

test("the snippet gaps name each `autoMode` list that lacks its entries, and a list with `$defaults` is no gap", () => {
  const root = "/plugins/dotclaude";
  const full = { ...snippetFor({}, root), enabledPlugins: {} };
  expect(snippetGaps(full, root)).toStrictEqual([
    "autoMode.allow",
    "autoMode.soft_deny",
    "autoMode.hard_deny",
    "autoMode.environment",
  ]);
  const withLists = { ...full, ...planAutoMode({}, []) };
  expect(snippetGaps(withLists, root)).toStrictEqual([]);
});

test("the snippet gaps skip the `autoMode` lists when they do not count", () => {
  const root = "/plugins/dotclaude";
  const full = { ...snippetFor({}, root), enabledPlugins: {} };
  expect(snippetGaps(full, root, false)).toStrictEqual([]);
});

test("the `drift` command reports the `autoMode` lists of the user scope only", async () => {
  const root = "/plugins/dotclaude";
  const dir = tmpDir("dc-drift");
  const places = {
    configDir: path.join(dir, "config"),
    projectDir: path.join(dir, "project"),
    root,
  };
  fs.mkdirSync(places.configDir, { recursive: true });
  fs.mkdirSync(path.join(places.projectDir, ".claude"), { recursive: true });
  const settings = JSON.stringify({ ...snippetFor({}, root), ...profile });
  await Bun.write(path.join(places.configDir, "settings.json"), settings);
  await Bun.write(
    path.join(places.projectDir, ".claude", "settings.json"),
    settings,
  );
  const io = { log: () => {}, error: () => {} };
  expect(await driftCommand({ scope: "project" }, places, io)).toBe(0);
  expect(await driftCommand({ scope: "user" }, places, io)).toBe(1);
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
  expect(staleStatusLines(settings, root)).toStrictEqual([
    "statusLine.command",
  ]);
});
