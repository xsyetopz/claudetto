// The skills of the core plugin (task 13.4): each one is a dotclaude part, and has a description.
// A user-invoked skill sets `disable-model-invocation: true`, which keeps it out of the listing.
// The size bounds of the skill metadata and body are in `tests/support/sizes.test.ts`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { REPO } from "../support/repo.ts";

const SKILLS = path.join(REPO, "plugins/dotclaude/skills");
/** The skills that write user configuration. Design D5 makes them user-invoked only. */
const USER_INVOKED = ["setup"];

/** The frontmatter keys of a skill file, as strings. */
function frontmatter(text: string) {
  const block = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "";
  return Object.fromEntries(
    block
      .split("\n")
      .map((line) => /^([\w-]+):\s*(.*)$/.exec(line))
      .filter((m): m is RegExpExecArray => m !== null)
      .map(([, key, value]) => [
        key,
        (value as string).replace(/^"(.*)"$/, "$1"),
      ]),
  );
}

const names = fs
  .readdirSync(SKILLS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
const skill = async (name: string) =>
  frontmatter(await Bun.file(path.join(SKILLS, name, "SKILL.md")).text());

test("the plugin has at least one skill, and each user-invoked skill exists", () => {
  expect(names.length > 0, `${names.length}`).toBeTruthy();
  for (const name of USER_INVOKED)
    expect(names.includes(name), names.join("\n")).toBeTruthy();
});

for (const name of names) {
  test(`skill ${name} is a dotclaude part with a file and a name that match`, async () => {
    expect(fs.existsSync(path.join(SKILLS, name, "SKILL.md"))).toBe(true);
    expect((await skill(name)).name).toBe(name);
  });

  test(`skill ${name} has a description`, async () => {
    const { description } = await skill(name);
    expect(description?.length > 0, `${description?.length}`).toBeTruthy();
  });
}

test("the frontmatter reader handles quotes and a missing block", () => {
  expect(
    frontmatter('---\nname: a\nargument-hint: "[x]"\n---\nbody'),
  ).toStrictEqual({
    name: "a",
    "argument-hint": "[x]",
  });
  expect(frontmatter("no block")).toStrictEqual({});
});
