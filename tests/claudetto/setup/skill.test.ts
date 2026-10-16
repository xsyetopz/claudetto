// The `setup` skill: a user-invoked skill that runs the CLI `claudetto-setup`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { REPO } from "../../support/repo.ts";

const PLUGIN = path.join(REPO, "plugins/claudetto");

/** The frontmatter keys of a skill file, as strings. */
const frontmatter = (text: string): Record<string, string> => {
  const block = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "";
  return Object.fromEntries(
    block
      .split("\n")
      .map((line) => /^([\w-]+):\s*(.*)$/.exec(line))
      .filter((m): m is RegExpExecArray => m !== null)
      .map(([, key, value]) => [
        key as string,
        (value as string).replace(/^"(.*)"$/, "$1"),
      ]),
  );
};

test("the frontmatter reader handles quotes and a missing block", () => {
  expect(
    frontmatter('---\nname: a\nargument-hint: "[x]"\n---\nbody'),
  ).toStrictEqual({ name: "a", "argument-hint": "[x]" });
  expect(frontmatter("no block")).toStrictEqual({});
});

test("the skill `setup` has a name, a description, and no model invocation", async () => {
  const meta = frontmatter(
    await Bun.file(path.join(PLUGIN, "skills/setup/SKILL.md")).text(),
  );
  expect(meta["name"]).toBe("setup");
  expect((meta["description"] ?? "").length).toBeGreaterThan(0);
  expect(meta["disable-model-invocation"]).toBe("true");
});

test("the plugin ships the launcher of the CLI that the skill runs", () => {
  expect(fs.existsSync(path.join(PLUGIN, "bin/claudetto-setup"))).toBe(true);
});

test("the skill `setup` gives the same `Glob` and `Grep` alias line as the wiki page `Trim`", async () => {
  const alias = "alias claude='claude --allowedTools Glob,Grep'";
  const skill = await Bun.file(
    path.join(PLUGIN, "skills/setup/SKILL.md"),
  ).text();
  const wiki = await Bun.file(path.join(REPO, "wiki/claudetto/Trim.md")).text();
  expect(skill).toContain(alias);
  expect(wiki).toContain(alias);
  expect(skill).toContain("Do not edit the startup file");
});
