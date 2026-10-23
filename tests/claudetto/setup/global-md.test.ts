// The global `~/.claude/CLAUDE.md` of setup and the inventory of `~/.claude/rules/*.md` (task 3.9 of change `release-0-3-0-alpha-2`, spec `setup`, "Global Memory File").

import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GLOBAL_CLAUDE_MD_MAX_LINES } from "../../../plugins/claudetto/slices/setup/limits.ts";
import { runMain } from "../../support/setup-run.ts";

const START =
  "<!-- claudetto setup: /claudetto:setup rewrites only this block -->";
const END = "<!-- /claudetto setup -->";

/** A new folder that is the config folder and the project, with `files` in it. */
const folder = async (files: Record<string, string> = {}) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "setup-global-"));
  for (const [file, text] of Object.entries(files))
    await Bun.write(path.join(dir, file), text);
  return dir;
};

const read = (dir: string, file: string) =>
  Bun.file(path.join(dir, file)).text();

const lines = (text: string) => text.replace(/\n$/, "").split("\n");

test("New Global File: the file starts with `# CLAUDE.md`, names claudetto setup, holds the rules of the user, and has 20 lines or fewer", async () => {
  const dir = await folder();
  const rules = ["## Prose", "- One sentence per line.", "- No semicolons."];
  const { status } = await runMain(dir, [
    "--global-md",
    ...rules.map((r) => `--global-rule=${r}`),
    "--apply",
  ]);
  const text = await read(dir, "CLAUDE.md");
  expect(status).toBe(0);
  expect(lines(text)[0]).toBe("# CLAUDE.md");
  expect(text).toContain("This file comes from claudetto setup.");
  expect(text.split(START)[1]?.split(END)[1]).toContain("- No semicolons.");
  expect(lines(text).length).toBeLessThanOrEqual(GLOBAL_CLAUDE_MD_MAX_LINES);
});

test("the dry run writes nothing", async () => {
  const dir = await folder();
  const { status, text } = await runMain(dir, ["--global-md"]);
  expect(status).toBe(0);
  expect(text).toContain("Dry run");
  expect(await Bun.file(path.join(dir, "CLAUDE.md")).exists()).toBe(false);
});

test("User Lines Stay: setup rewrites only the lines between the comments, and a second run changes nothing", async () => {
  const dir = await folder({
    "CLAUDE.md": `# CLAUDE.md\n${START}\nOld origin line.\n${END}\n\n- Mine one.\n- Mine two.\n`,
  });
  const args = [
    "--global-md",
    "--global-rule=- Not for an old file",
    "--apply",
  ];
  await runMain(dir, args);
  const once = await read(dir, "CLAUDE.md");
  expect(once).toBe(
    `# CLAUDE.md\n${START}\nThis file comes from claudetto setup. Edit each line below the block freely.\n${END}\n\n- Mine one.\n- Mine two.\n`,
  );
  await runMain(dir, args);
  expect(await read(dir, "CLAUDE.md")).toBe(once);
});

test("a file with no block gets the block under its title, and keeps each line", async () => {
  const dir = await folder({ "CLAUDE.md": "# CLAUDE.md\n- Mine.\n" });
  await runMain(dir, ["--global-md", "--apply"]);
  const text = await read(dir, "CLAUDE.md");
  expect(text).toBe(
    `# CLAUDE.md\n${START}\nThis file comes from claudetto setup. Edit each line below the block freely.\n${END}\n- Mine.\n`,
  );
});

test("Over the Bound: more than 20 lines write nothing and ask which lines move to `~/.claude/rules/`", async () => {
  const many = Array.from({ length: 20 }, (_, i) => `- Rule ${i}.`).join("\n");
  const old = `# CLAUDE.md\n${many}\n`;
  const dir = await folder({ "CLAUDE.md": old });
  const { status, text } = await runMain(dir, ["--global-md", "--apply"]);
  expect(status).toBe(1);
  expect(text).toContain("~/.claude/rules/");
  expect(await read(dir, "CLAUDE.md")).toBe(old);
  const fresh = await folder();
  const rules = Array.from(
    { length: 20 },
    (_, i) => `--global-rule=- Rule ${i}.`,
  );
  const run = await runMain(fresh, ["--global-md", ...rules, "--apply"]);
  expect(run.status).toBe(1);
  expect(await Bun.file(path.join(fresh, "CLAUDE.md")).exists()).toBe(false);
});

test("Owned Rule Stays: `context7.md` with its paired skill and `claudetto-docs:find-docs` on gets the `ctx7` removal offer, and setup leaves the file", async () => {
  const rule = "Use ctx7 for docs. My own edit.\n";
  const dir = await folder({
    "rules/context7.md": rule,
    "rules/mine.md": "A rule of mine.\n",
    "skills/find-docs/SKILL.md":
      "---\nname: find-docs\ndescription: Docs.\n---\n",
    "settings.json": JSON.stringify({
      enabledPlugins: { "claudetto-docs@claudetto": true },
    }),
  });
  const inventory = JSON.parse((await runMain(dir, ["--inventory"])).text);
  const owned = inventory.rules.find(
    (r: { file: string }) => r.file === "rules/context7.md",
  );
  expect(owned.owner).toBe("ctx7");
  expect(owned.removal).toBe("ctx7 remove --claude --cli");
  expect(owned.note).toContain("deletes any edit");
  expect(owned.foldOrRemove).toBeUndefined();
  const other = inventory.rules.find(
    (r: { file: string }) => r.file === "rules/mine.md",
  );
  expect(other.owner).toBeNull();
  expect(other.foldOrRemove).toBe(true);
  await runMain(dir, ["--global-md", "--apply"]);
  await runMain(dir, ["--scope", "user", "--apply"]);
  expect(await read(dir, "rules/context7.md")).toBe(rule);
});

test("a `context7.md` with no paired skill has no owner, and with `claudetto-docs` off it gets no removal offer", async () => {
  const dir = await folder({ "rules/context7.md": "x\n" });
  const [row] = JSON.parse((await runMain(dir, ["--inventory"])).text).rules;
  expect(row.owner).toBeNull();
  expect(row.foldOrRemove).toBe(true);
  const off = await folder({
    "rules/context7.md": "x\n",
    "skills/find-docs/SKILL.md": "x",
  });
  const [owned] = JSON.parse((await runMain(off, ["--inventory"])).text).rules;
  expect(owned.owner).toBe("ctx7");
  expect(owned.removal).toBeUndefined();
});

test("`--global-md` with `--inventory` prints the usage and exits with code 2", async () => {
  const dir = await folder();
  expect((await runMain(dir, ["--global-md", "--inventory"])).status).toBe(2);
});
