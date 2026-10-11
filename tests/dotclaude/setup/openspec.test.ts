// Runs of `skills/setup/scripts/openspec.mjs` for the OpenSpec steps (task 15.4).
// The `openspec` here is a STUB Node script in a temporary `bin` folder.
// It logs each call to `calls.log`, and keeps `delivery` and `telemetry.enabled` in files.
// The real CLI run is in the task 15.4 evidence.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { writeProgram } from "../../support/fake-program.ts";
import { PLUGINS, tmpDir } from "../../support/repo.ts";

type Dirs = { root: string; config: string; project: string; stub: string };

const PLUGIN = path.join(PLUGINS, "dotclaude");
const SCRIPT = path.join(PLUGIN, "skills/setup/scripts/openspec.mjs");
const NODE = process.execPath;
const STUB = `const fs = require("node:fs");
const path = require("node:path");
(async () => {
const dir = process.env.STUB_DIR;
const args = process.argv.slice(2);
fs.appendFileSync(path.join(dir, "calls.log"), args.join(" ") + "\\n");
if (args[0] === "--version") console.log("1.14.1");
else if (args[0] === "config" && args[1] === "get") {
  const file = path.join(dir, args[2]);
  if (fs.existsSync(file)) console.log((await Bun.file(file).text()).split("\\n")[0]);
} else if (args[0] === "config" && args[1] === "set")
  await Bun.write(path.join(dir, args[2]), args[3] + "\\n");
})();
`;

/** A temporary config folder, project folder, and stub folder. */
async function sandbox() {
  const root = tmpDir("dc-openspec");
  const dirs = {
    root,
    config: path.join(root, "config"),
    project: path.join(root, "project"),
    stub: path.join(root, "stub"),
  };
  for (const d of [dirs.config, dirs.project, dirs.stub]) fs.mkdirSync(d);
  await writeProgram(dirs.stub, "openspec", STUB);
  return dirs;
}

// A `.cmd` stub runs through `cmd.exe`, which Windows finds with `ComSpec` and the system folder.
const windows =
  process.platform === "win32"
    ? {
        SystemRoot: process.env["SystemRoot"],
        ComSpec: process.env["ComSpec"],
        PATHEXT: process.env["PATHEXT"],
      }
    : {};
const system =
  process.platform === "win32"
    ? [`${process.env["SystemRoot"]}\\System32`]
    : [];

const setup = (d: Dirs, args: string[]) => {
  const r = Bun.spawnSync([NODE, "--no-env-file", SCRIPT, ...args], {
    env: {
      CLAUDE_CONFIG_DIR: d.config,
      CLAUDE_PROJECT_DIR: d.project,
      PATH: [d.stub, ...system].join(path.delimiter),
      STUB_DIR: d.stub,
      ...windows,
    },
    cwd: d.project,
  });
  return { code: r.exitCode, out: r.stdout.toString() };
};
/** The calls that change something: no `--version`, and no `config get`. */
const calls = async (d: Dirs) => {
  const file = path.join(d.stub, "calls.log");
  return fs.existsSync(file)
    ? (await Bun.file(file).text())
        .trim()
        .split(/\r?\n/)
        .filter((c) => c !== "--version" && !c.startsWith("config get"))
    : [];
};

test("the preview lists the OpenSpec steps and runs none", async () => {
  const d = await sandbox();
  const r = setup(d, []);
  expect(
    r.out.includes("config set telemetry.enabled false"),
    r.out,
  ).toBeTruthy();
  expect(r.out.includes("openspec init --tools claude"), r.out).toBeTruthy();
  expect(r.out.includes("config set delivery skills"), r.out).toBeTruthy();
  expect(r.out.includes("openspec update"), r.out).toBeTruthy();
  expect(await calls(d)).toStrictEqual([]);
  expect(fs.existsSync(path.join(d.stub, "delivery"))).toBe(false);
  fs.rmSync(d.root, { recursive: true });
});

test("`--apply` runs init, then the delivery and the update, with telemetry off first", async () => {
  const d = await sandbox();
  const r = setup(d, ["--apply"]);
  expect(r.code).toBe(0);
  expect(await calls(d)).toStrictEqual([
    "config set telemetry.enabled false",
    "init --tools claude --no-animation",
    "config set delivery skills",
    "update",
  ]);
  fs.rmSync(d.root, { recursive: true });
});

test("a project with skills delivery, telemetry off, and no command copies needs no step", async () => {
  const d = await sandbox();
  fs.mkdirSync(path.join(d.project, "openspec"));
  await Bun.write(path.join(d.stub, "delivery"), "skills\n");
  await Bun.write(path.join(d.stub, "telemetry.enabled"), "false\n");
  setup(d, ["--apply"]);
  expect((await calls(d)).some((c) => c.startsWith("update"))).toBe(false);
  fs.rmSync(d.root, { recursive: true });
});

test("command copies in `.claude/commands/opsx` need only an `update`", async () => {
  const d = await sandbox();
  fs.mkdirSync(path.join(d.project, "openspec"));
  fs.mkdirSync(path.join(d.project, ".claude/commands/opsx"), {
    recursive: true,
  });
  await Bun.write(path.join(d.project, ".claude/commands/opsx/apply.md"), "");
  await Bun.write(path.join(d.stub, "delivery"), "skills\n");
  await Bun.write(path.join(d.stub, "telemetry.enabled"), "false\n");
  setup(d, ["--apply"]);
  expect(await calls(d)).toStrictEqual(["update"]);
  fs.rmSync(d.root, { recursive: true });
});
