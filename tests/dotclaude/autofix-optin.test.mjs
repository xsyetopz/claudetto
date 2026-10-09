// Auto-fix is opt-in (spec auto-fix, design D7): the hooks run nothing until the user turns the switch on in setup.
// The project tool is a FAKE local binary that logs each run. No real formatter or linter runs.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  enabled,
  fix,
  record,
  stateFile,
} from "../../plugins/dotclaude/features/autofix/cli.mjs";
import { OPT_IN } from "../../plugins/dotclaude/features/setup/optin.mjs";

const PLUGIN = path.join(import.meta.dirname, "../../plugins/dotclaude");
const SCRIPT = path.join(PLUGIN, "skills/setup/scripts/settings.mjs");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "autofix-optin-"));

/** A project with a Biome config and a fake local `biome` that logs each run to `.calls`. */
function project() {
  const root = tmp();
  fs.mkdirSync(path.join(root, "node_modules/.bin"), { recursive: true });
  fs.writeFileSync(path.join(root, "biome.json"), "{}");
  fs.writeFileSync(path.join(root, "a.js"), "x\n");
  fs.writeFileSync(
    path.join(root, "node_modules/.bin/biome"),
    `#!/usr/bin/env node\nrequire("node:fs").appendFileSync(${JSON.stringify(path.join(root, ".calls"))}, "run\\n");\n`,
    { mode: 0o755 },
  );
  return root;
}

const edit = (root, session_id) => ({
  session_id,
  cwd: root,
  hook_event_name: "PostToolUse",
  tool_input: { file_path: path.join(root, "a.js") },
});

test("the switch is the value `1` of `DOTCLAUDE_AUTOFIX` and nothing else", () => {
  expect(enabled({})).toBe(false);
  expect(enabled({ DOTCLAUDE_AUTOFIX: "0" })).toBe(false);
  expect(enabled({ DOTCLAUDE_AUTOFIX: "true" })).toBe(false);
  expect(enabled({ DOTCLAUDE_AUTOFIX: "1" })).toBe(true);
  expect(OPT_IN.autofix.env).toEqual({ DOTCLAUDE_AUTOFIX: "1" });
});

test("off by default: the recorder writes no file and the fixer runs no tool", () => {
  const root = project();
  const dir = tmp();
  const id = "off-1";
  record(edit(root, id), dir, {});
  expect(fs.existsSync(stateFile(id, dir))).toBe(false);
  // A state file that exists anyway (written while the switch was on) still runs nothing.
  fs.writeFileSync(stateFile(id, dir), `${path.join(root, "a.js")}\n`);
  const stop = { session_id: id, cwd: root, hook_event_name: "Stop" };
  expect(fix(stop, {}, dir)).toBeUndefined();
  expect(fs.existsSync(path.join(root, ".calls"))).toBe(false);
});

test("on: the recorder writes the path and the fixer runs the local tool", () => {
  const root = project();
  const dir = tmp();
  const env = { DOTCLAUDE_AUTOFIX: "1" };
  record(edit(root, "on-1"), dir, env);
  expect(fs.existsSync(stateFile("on-1", dir))).toBe(true);
  const stop = { session_id: "on-1", cwd: root, hook_event_name: "Stop" };
  expect(fix(stop, env, dir)).toBeUndefined();
  expect(fs.existsSync(path.join(root, ".calls"))).toBe(true);
});

test("the entry point prints nothing and runs nothing with the switch off", () => {
  const root = project();
  const cli = path.join(PLUGIN, "features/autofix/cli.mjs");
  const run = (env, event) =>
    Bun.spawnSync([Bun.which("node"), cli], {
      env: { PATH: process.env.PATH, ...env },
      stdin: new TextEncoder().encode(
        JSON.stringify({ ...edit(root, "cli-1"), hook_event_name: event }),
      ),
    });
  for (const event of ["PostToolUse", "Stop"]) {
    const r = run({}, event);
    expect(r.exitCode).toBe(0);
    expect(r.stdout.toString()).toBe("");
  }
  expect(fs.existsSync(path.join(root, ".calls"))).toBe(false);
});

test("setup adds the switch only with `--with autofix`", () => {
  const run = (config, ...args) =>
    Bun.spawnSync([Bun.which("node"), SCRIPT, ...args, "--apply"], {
      env: { CLAUDE_CONFIG_DIR: config, CLAUDE_PROJECT_DIR: config, PATH: "" },
    });
  const settings = (c) =>
    JSON.parse(fs.readFileSync(path.join(c, "settings.json"), "utf8"));
  const off = tmp();
  expect(run(off).exitCode).toBe(0);
  expect(settings(off).env.DOTCLAUDE_AUTOFIX).toBeUndefined();
  const on = tmp();
  expect(run(on, "--with", "autofix").exitCode).toBe(0);
  expect(settings(on).env.DOTCLAUDE_AUTOFIX).toBe("1");
});
