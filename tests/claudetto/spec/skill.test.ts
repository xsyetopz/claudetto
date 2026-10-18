// The skill `spec`: the frontmatter, the rule of each preset, and the files that ship next to it.

import { expect, test } from "bun:test";
import path from "node:path";
import { REPO } from "../../support/repo.ts";

const DIR = path.join(REPO, "plugins/claudetto/skills/spec");
const skill = await Bun.file(path.join(DIR, "SKILL.md")).text();

test("the skill `spec` is user-invoked and takes a preset and a change", () => {
  expect(skill).toMatch(/^name: spec$/m);
  expect(skill).toMatch(/^disable-model-invocation: true$/m);
  expect(skill).toContain('argument-hint: "[task|story|epic] [change]"');
});

test.each([
  ["a named preset", "- The user names a preset: that preset."],
  [
    "a new project",
    "- No `openspec/specs/` and a near-empty repository: `epic`.",
  ],
  ["no change of behavior", "- The change has no change of behavior: `task`."],
  ["one capability", "- The change touches one capability: `story`."],
  ["doubt", "- Unsure: `story`, and ask the user."],
])("the skill `spec` has the rule for %s", (_name, line) => {
  expect(skill).toContain(line);
});

test("the skill `spec` copies only what is missing and never overwrites", () => {
  expect(skill).toContain("Never overwrite a file.");
  expect(skill).toContain(
    "to `openspec/schemas/<preset>` only when that folder is missing",
  );
  expect(skill).toContain(
    "`openspec/config.yaml` only when that file is missing",
  );
  expect(skill).toContain("ask the user before you change it");
});

test.each(["task", "story", "epic", "config"])(
  "the skill `spec` ships %s next to it",
  async (name) => {
    const file =
      name === "config" ? "config.yaml" : `schemas/${name}/schema.yaml`;
    expect(await Bun.file(path.join(DIR, file)).exists()).toBe(true);
  },
);
