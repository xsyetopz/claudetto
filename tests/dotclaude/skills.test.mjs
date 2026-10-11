// The skills of the core plugin (task 13.4): each one is a dotclaude part, and has a description.
// A user-invoked skill sets `disable-model-invocation: true`, which keeps it out of the listing.
// The size bounds of the skill metadata and body are in `tests/support/sizes.test.mjs`.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { REPO } from "../support/repo.mjs";

const SKILLS = path.join(REPO, "plugins/dotclaude/skills");
/** The skills that write user configuration. Design D5 makes them user-invoked only. */
const USER_INVOKED = ["setup"];

/** The frontmatter keys of a skill file, as strings. */
function frontmatter(text) {
  const block = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "";
  return Object.fromEntries(
    block
      .split("\n")
      .map((line) => /^([\w-]+):\s*(.*)$/.exec(line))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.replace(/^"(.*)"$/, "$1")]),
  );
}

const names = fs
  .readdirSync(SKILLS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
const skill = (name) =>
  frontmatter(fs.readFileSync(path.join(SKILLS, name, "SKILL.md"), "utf8"));

test("the plugin has at least one skill, and each user-invoked skill exists", () => {
  assert.ok(names.length > 0, `${names.length}`);
  for (const name of USER_INVOKED)
    assert.ok(names.includes(name), names.join("\n"));
});

for (const name of names) {
  test(`skill ${name} is a dotclaude part with a file and a name that match`, () => {
    assert.equal(fs.existsSync(path.join(SKILLS, name, "SKILL.md")), true);
    assert.equal(skill(name).name, name);
  });

  test(`skill ${name} has a description`, () => {
    assert.ok(
      skill(name).description?.length > 0,
      `${skill(name).description?.length}`,
    );
  });
}

test("the frontmatter reader handles quotes and a missing block", () => {
  assert.deepEqual(
    frontmatter('---\nname: a\nargument-hint: "[x]"\n---\nbody'),
    {
      name: "a",
      "argument-hint": "[x]",
    },
  );
  assert.deepEqual(frontmatter("no block"), {});
});
