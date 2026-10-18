// The optional steps of the add-ons in `claudetto-setup --addons`.
// A step shows only for an add-on that `enabledPlugins` lists as enabled, in the settings files of Claude Code.

import { expect, test } from "bun:test";
import { mkdir, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { main } from "../../../plugins/claudetto/slices/setup/adapters/cli.ts";
import { REPO } from "../../support/repo.ts";

const INSTALL = "codegraph install --target claude --location global";

type Files = { user?: object; project?: object; local?: object };

/** Runs `claudetto-setup --addons` with the given settings files, and returns the exit status and the printed lines. */
const run = async (files: Files, extra: string[] = []) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "addons-"));
  const config = path.join(dir, "config");
  const project = path.join(dir, "project");
  await mkdir(path.join(project, ".claude"), { recursive: true });
  await mkdir(config, { recursive: true });
  const put = (file: string, data?: object) =>
    data ? Bun.write(file, JSON.stringify(data)) : undefined;
  await put(path.join(config, "settings.json"), files.user);
  await put(path.join(project, ".claude/settings.json"), files.project);
  await put(path.join(project, ".claude/settings.local.json"), files.local);
  const lines: string[] = [];
  const io = { log: (l: string) => lines.push(l), error: () => {} };
  const env = { CLAUDE_CONFIG_DIR: config, CLAUDE_PROJECT_DIR: project };
  const status = await main(["--addons", ...extra], env, project, io);
  return { status, text: lines.join("\n"), dir };
};

const on = (name = "claudetto-codegraph@claudetto") => ({
  enabledPlugins: { [name]: true },
});
const off = { enabledPlugins: { "claudetto-codegraph@claudetto": false } };

test("an enabled `claudetto-codegraph` gets the step that runs `codegraph install`", async () => {
  const { status, text } = await run({ user: on() });
  expect(status).toBe(0);
  expect(text).toContain(INSTALL);
});

test("the add-on can come from any marketplace name", async () => {
  const { text } = await run({ user: on("claudetto-codegraph@mine") });
  expect(text).toContain(INSTALL);
});

test("an add-on that is not listed, or is disabled, gets no text", async () => {
  expect((await run({})).text).toBe("");
  expect((await run({ user: on("claudetto-docs@claudetto") })).text).toBe("");
  expect((await run({ user: off })).text).toBe("");
});

test("a name that only starts with the add-on name gets no text", async () => {
  expect((await run({ user: on("claudetto-codegraph-x@m") })).text).toBe("");
});

test("a project or local setting that disables the add-on beats the user setting", async () => {
  expect((await run({ user: on(), project: off })).text).toBe("");
  expect((await run({ user: on(), local: off })).text).toBe("");
});

test("a project setting can enable an add-on that the user file does not list", async () => {
  expect((await run({ project: on() })).text).toContain(INSTALL);
});

test("`--addons` rejects `--apply` and writes no settings file", async () => {
  const { status, dir } = await run({}, ["--apply"]);
  expect(status).toBe(2);
  expect(await Bun.file(path.join(dir, "config/settings.json")).exists()).toBe(
    false,
  );
});

test("the skill `setup` asks before it runs the step", async () => {
  const skill = await Bun.file(
    path.join(REPO, "plugins/claudetto/skills/setup/SKILL.md"),
  ).text();
  expect(skill).toContain("claudetto-setup --addons");
  expect(skill).toContain(INSTALL);
  expect(skill).toMatch(/AskUserQuestion[\s\S]*codegraph install/);
});
