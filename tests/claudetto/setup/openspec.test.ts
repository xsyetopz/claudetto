// The OpenSpec finds of `claudetto-setup` and their removal (task 3.8 of change `release-0-3-0-alpha-2`, spec `setup`, "OpenSpec Goes").
// A stub of each package manager sits on a temp `PATH`, so no test runs a real uninstall.

import { expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { main } from "../../../plugins/claudetto/slices/setup/adapters/cli.ts";
import { captureIo } from "../../support/io.ts";

/** A script on `bin` that logs its arguments to `calls` and runs `body`. */
const stub = async (bin: string, name: string, body: string) => {
  const file = path.join(bin, name);
  await Bun.write(
    file,
    `#!/bin/sh\necho "${name} $*" >> "\${0%/*}/calls"\n${body}\n`,
  );
  await chmod(file, 0o755);
};

/** A new project with a `bin` folder that is the whole `PATH`: a stub `bun` that lists OpenSpec and drops the stub `openspec` on a remove. */
const setup = async (list: string) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "setup-openspec-"));
  const bin = path.join(dir, "bin");
  await mkdir(bin);
  await stub(
    bin,
    "bun",
    `case "$1" in pm) echo "${list}";; remove) /bin/rm -f "\${0%/*}/openspec";; esac`,
  );
  await stub(bin, "openspec", "echo 1.14.3");
  const env = {
    CLAUDE_CONFIG_DIR: dir,
    CLAUDE_PROJECT_DIR: dir,
    HOME: dir,
    PATH: bin,
  };
  const calls = async () =>
    (
      await Bun.file(path.join(bin, "calls"))
        .text()
        .catch(() => "")
    ).trim();
  return { dir, bin, env, calls };
};

const run = async (env: NodeJS.ProcessEnv, dir: string, args: string[]) => {
  const { io, text } = captureIo();
  const status = await main(args, env, dir, io);
  return { status, text: text() };
};

test("Global Bun Install: `bun pm ls -g` lists OpenSpec, setup runs `bun remove -g @fission-ai/openspec`, and `which openspec` finds nothing", async () => {
  const { dir, bin, env, calls } = await setup(
    "└── @fission-ai/openspec@1.14.3",
  );
  expect(Bun.which("openspec", { PATH: bin })).not.toBeNull();
  const { status, text } = await run(env, dir, [
    "--remove-openspec",
    "--apply",
  ]);
  expect(status).toBe(0);
  expect(text).toContain("bun remove -g @fission-ai/openspec");
  expect(await calls()).toContain("bun remove -g @fission-ai/openspec");
  expect(Bun.which("openspec", { PATH: bin })).toBeNull();
});

test("Global Bun Install: without `--apply` setup lists the find and removes nothing", async () => {
  const { dir, bin, env, calls } = await setup(
    "└── @fission-ai/openspec@1.14.3",
  );
  const { status, text } = await run(env, dir, ["--remove-openspec"]);
  expect(status).toBe(0);
  expect(text).toContain("Dry run");
  expect(await calls()).not.toContain("remove");
  expect(Bun.which("openspec", { PATH: bin })).not.toBeNull();
});

test("Global Bun Install: the inventory holds the find with its version", async () => {
  const { dir, env } = await setup("└── @fission-ai/openspec@1.14.3");
  const { text } = await run(env, dir, ["--inventory"]);
  expect(JSON.parse(text).openspec.global).toStrictEqual([
    { manager: "bun", version: "1.14.3" },
  ]);
});

test("Global Bun Install: an `openspec` that stays on the `PATH` after the removal exits with code 1", async () => {
  const { dir, env, bin } = await setup("└── @fission-ai/openspec@1.14.3");
  await stub(
    bin,
    "bun",
    `case "$1" in pm) echo "@fission-ai/openspec@1.14.3";; esac`,
  );
  const { status, text } = await run(env, dir, [
    "--remove-openspec",
    "--apply",
  ]);
  expect(status).toBe(1);
  expect(text).toContain("still on the PATH");
});

test("Dev Dependency Stays: a project that lists OpenSpec only in `devDependencies` gets a report and no change", async () => {
  const { dir, env, calls, bin } = await setup("");
  await Bun.file(path.join(bin, "openspec")).delete();
  const pkg = JSON.stringify({
    devDependencies: { "@fission-ai/openspec": "1.14.3" },
  });
  await Bun.write(path.join(dir, "package.json"), pkg);
  const { status, text } = await run(env, dir, [
    "--remove-openspec",
    "--apply",
  ]);
  expect(status).toBe(0);
  expect(text).toContain("package.json lists @fission-ai/openspec");
  expect(await calls()).not.toContain("remove");
  expect(await Bun.file(path.join(dir, "package.json")).text()).toBe(pkg);
});

test("the `openspec-*` skills and `opsx` commands are removed, and other skills stay", async () => {
  const { dir, env, bin } = await setup("");
  await Bun.file(path.join(bin, "openspec")).delete();
  for (const file of [
    "skills/openspec-propose/SKILL.md",
    ".claude/skills/openspec-apply/SKILL.md",
    "commands/opsx/propose.md",
    "skills/other/SKILL.md",
  ])
    await Bun.write(path.join(dir, file), "x");
  const { status } = await run(env, dir, ["--remove-openspec", "--apply"]);
  expect(status).toBe(0);
  const there = (file: string) => Bun.file(path.join(dir, file)).exists();
  expect(await there("skills/openspec-propose/SKILL.md")).toBe(false);
  expect(await there(".claude/skills/openspec-apply/SKILL.md")).toBe(false);
  expect(await there("commands/opsx/propose.md")).toBe(false);
  expect(await there("skills/other/SKILL.md")).toBe(true);
});

test("`--remove-openspec` with `--inventory` prints the usage and exits with code 2", async () => {
  const { dir, env } = await setup("");
  expect(
    (await run(env, dir, ["--remove-openspec", "--inventory"])).status,
  ).toBe(2);
});
