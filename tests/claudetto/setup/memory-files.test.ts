// The `claudeMdExcludes` offer and the `CLAUDE.local.md` template of setup (task 3.11 of change `release-0-3-0-alpha-2`, design D21).

import { expect, test } from "bun:test";
import { mkdir, mkdtemp, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { main } from "../../../plugins/claudetto/modules/setup/adapters/cli.ts";
import { captureIo } from "../../support/io.ts";

/** A new folder `root` with a parent file `CLAUDE.md`, and a project `root/project`. */
const tree = async () => {
  const root = await realpath(
    await mkdtemp(path.join(os.tmpdir(), "setup-md-")),
  );
  const project = path.join(root, "project");
  await mkdir(project);
  await Bun.write(path.join(root, "CLAUDE.md"), "Rules of the parent.\n");
  return { root, project };
};

const run = async (project: string, args: string[]) => {
  const { io, text } = captureIo();
  const config = path.join(project, "config");
  const env = {
    CLAUDE_CONFIG_DIR: config,
    CLAUDE_PROJECT_DIR: project,
    HOME: config,
  };
  return { status: await main(args, env, project, io), text: text() };
};

test("Parent File Excluded: the inventory finds the parent file, and `--exclude-md` writes its path to `claudeMdExcludes`", async () => {
  const { root, project } = await tree();
  const parent = path.join(root, "CLAUDE.md");
  const found = JSON.parse((await run(project, ["--inventory"])).text);
  expect(found.memoryFiles).toContainEqual({
    path: parent,
    kind: "parent",
    glob: parent,
    excluded: false,
  });
  const args = ["--scope", "local", "--exclude-md", parent, "--apply"];
  expect((await run(project, args)).status).toBe(0);
  await run(project, args);
  const file = path.join(project, ".claude/settings.local.json");
  expect(await Bun.file(file).json()).toStrictEqual({
    claudeMdExcludes: [parent],
  });
  const after = JSON.parse(
    (await run(project, ["--scope", "local", "--inventory"])).text,
  );
  expect(after.memoryFiles).toContainEqual(
    expect.objectContaining({ path: parent, excluded: true }),
  );
});

test("Parent File Excluded: a vendored `CLAUDE.md` gets one glob for its folder", async () => {
  const { project } = await tree();
  const file = path.join(project, "node_modules/@scope/pkg/CLAUDE.md");
  await Bun.write(file, "Vendor rules.\n");
  const found = JSON.parse((await run(project, ["--inventory"])).text);
  expect(found.memoryFiles).toContainEqual({
    path: file,
    kind: "vendor",
    glob: path.join(project, "node_modules/**/CLAUDE.md"),
    excluded: false,
  });
});

test("Local Notes Ignored: `--local-notes` writes the template once and its line to `.gitignore`, and keeps the notes of the user", async () => {
  const { project } = await tree();
  await mkdir(path.join(project, ".git"));
  await Bun.write(path.join(project, ".gitignore"), "dist\n");
  const args = ["--local-notes", "--apply"];
  expect((await run(project, args)).status).toBe(0);
  const notes = path.join(project, "CLAUDE.local.md");
  expect(await Bun.file(notes).exists()).toBe(true);
  await Bun.write(notes, "# CLAUDE.local.md\nMy note.\n");
  await run(project, args);
  expect(await Bun.file(notes).text()).toBe("# CLAUDE.local.md\nMy note.\n");
  const ignore = await Bun.file(path.join(project, ".gitignore")).text();
  expect(ignore.startsWith("dist\n")).toBe(true);
  expect(ignore.split("/CLAUDE.local.md").length - 1).toBe(1);
});

test("`--local-notes` in a project with no `.git/` writes the file and no `.gitignore`", async () => {
  const { project } = await tree();
  await run(project, ["--local-notes", "--apply"]);
  expect(await Bun.file(path.join(project, "CLAUDE.local.md")).exists()).toBe(
    true,
  );
  expect(await Bun.file(path.join(project, ".gitignore")).exists()).toBe(false);
});

test("the dry run of `--local-notes` writes nothing", async () => {
  const { project } = await tree();
  await run(project, ["--local-notes"]);
  expect(await Bun.file(path.join(project, "CLAUDE.local.md")).exists()).toBe(
    false,
  );
});
