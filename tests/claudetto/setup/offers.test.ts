// The offers of setup: the `claude-demo` alias, the off entries of each kind, and the status line refresh (tasks 3.6 and 3.7 of change `release-0-3-0-alpha-2`, spec `setup`).

import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { main } from "../../../plugins/claudetto/modules/setup/adapters/cli.ts";
import { captureIo } from "../../support/io.ts";
import { runMain, runSetup } from "../../support/setup-run.ts";

/** Runs `claudetto-setup --demo-alias` twice with the shell `shell` in a new home folder. */
const demo = async (shell: string) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "setup-demo-"));
  const env = { HOME: dir, SHELL: shell, CLAUDE_CONFIG_DIR: dir };
  const { io, text } = captureIo();
  const status = [
    await main(["--demo-alias"], env, dir, io),
    await main(["--demo-alias"], env, dir, io),
  ];
  return { dir, status, text: text() };
};

test("Demo Alias: after a yes, `~/.zshrc` holds the alias once, and no settings file gets `IS_DEMO`", async () => {
  const { dir, status } = await demo("/bin/zsh");
  const rc = await Bun.file(path.join(dir, ".zshrc")).text();
  expect(status).toStrictEqual([0, 0]);
  expect(rc.split("alias claude-demo='IS_DEMO=1 claude'").length - 1).toBe(1);
  expect(await Bun.file(path.join(dir, "settings.json")).exists()).toBe(false);
});

test("a shell with no known startup file gets the line to add, and no file", async () => {
  const { status, text } = await demo("/usr/bin/fish");
  expect(status[0]).toBe(2);
  expect(text).toContain("alias claude-demo='IS_DEMO=1 claude'");
});

test("Apple Docs: `--deny-mcp apple-docs` writes one `deniedMcpServers` entry to the project settings, also on a second run", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "setup-deny-"));
  const args = ["--scope", "project", "--deny-mcp", "apple-docs", "--apply"];
  await runMain(dir, args);
  await runMain(dir, args);
  const settings = await Bun.file(
    path.join(dir, ".claude/settings.json"),
  ).json();
  expect(settings).toStrictEqual({
    deniedMcpServers: [{ serverName: "apple-docs" }],
  });
});

for (const flag of ["--deny-mcp", "--off-plugin"])
  test(`\`${flag}\` with the user scope writes nothing and exits with code 2`, async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "setup-deny-"));
    const { status } = await runMain(dir, [flag, "x", "--apply"]);
    expect(status).toBe(2);
    expect(await Bun.file(path.join(dir, "settings.json")).exists()).toBe(
      false,
    );
  });

test("Tool Off and Skill Off: the user settings get `NotebookEdit` in `permissions.deny` and `find-skills` as `off`, and keep each other key", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "setup-off-"));
  const file = path.join(dir, "settings.json");
  await Bun.write(
    file,
    JSON.stringify({ permissions: { deny: ["Bash(x)"] }, model: "opus" }),
  );
  const args = [
    "--off-tool",
    "NotebookEdit",
    "--off-skill",
    "find-skills",
    "--apply",
  ];
  await runMain(dir, args);
  await runMain(dir, args);
  expect(await Bun.file(file).json()).toStrictEqual({
    permissions: { deny: ["Bash(x)", "NotebookEdit"] },
    model: "opus",
    skillOverrides: { "find-skills": "off" },
  });
});

test("Plugin Off: `--off-plugin` sets the plugin to `false` in the project settings only", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "setup-off-"));
  const id = "swift-lsp@claude-plugins-official";
  await runMain(dir, ["--scope", "project", "--off-plugin", id, "--apply"]);
  expect(
    await Bun.file(path.join(dir, ".claude/settings.json")).json(),
  ).toStrictEqual({
    enabledPlugins: { [id]: false },
  });
  expect(await Bun.file(path.join(dir, "settings.json")).exists()).toBe(false);
});

test("the status line refreshes each 5 seconds", async () => {
  const { settings } = await runSetup({});
  expect(settings.statusLine.refreshInterval).toBe(5);
});
