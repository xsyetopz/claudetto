// The skills of the core plugin (task 13.4): each one is a dotclaude part, and has a description.
// A user-invoked skill sets `disable-model-invocation: true`, which keeps it out of the listing.
// The size bounds of the skill metadata and body are in `tests/support/sizes.test.mjs`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "../..");
const SKILLS = path.join(ROOT, "plugins/dotclaude/skills");
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
  expect(names.length).toBeGreaterThan(0);
  for (const name of USER_INVOKED) expect(names).toContain(name);
});

for (const name of names) {
  test(`skill ${name} is a dotclaude part with a file and a name that match`, () => {
    expect(fs.existsSync(path.join(SKILLS, name, "SKILL.md"))).toBe(true);
    expect(skill(name).name).toBe(name);
  });

  test(`skill ${name} has a description`, () => {
    expect(skill(name).description?.length).toBeGreaterThan(0);
  });
}

test("the frontmatter reader handles quotes and a missing block", () => {
  expect(frontmatter('---\nname: a\nargument-hint: "[x]"\n---\nbody')).toEqual({
    name: "a",
    "argument-hint": "[x]",
  });
  expect(frontmatter("no block")).toEqual({});
});
