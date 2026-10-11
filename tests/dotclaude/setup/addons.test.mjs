// Runs of `skills/setup/scripts/addons.mjs`, the add-on step of setup.
// The `codegraph` here is a STUB Node script in a temporary `bin` folder that logs each call to `calls.log`.
// `PATH` holds only the stub folder, so `agent-browser` and `npx` are not found.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { installedAddons } from "../../../plugins/dotclaude/features/setup/addons.mjs";
import { writeProgram } from "../../support/fake-program.mjs";
import { PLUGINS, tmpDir } from "../../support/repo.mjs";

const SCRIPT = path.join(PLUGINS, "dotclaude/skills/setup/scripts/addons.mjs");
const STUB = `const fs = require("node:fs");
const path = require("node:path");
fs.appendFileSync(path.join(process.env.STUB_DIR, "calls.log"), process.argv.slice(2).join(" ") + "\\n");
if (process.argv[2] === "--version") console.log("9.9.9");
`;

/** A config folder with `ids` installed, a project folder, and a stub folder with `codegraph`. */
function sandbox(ids) {
  const root = tmpDir("dc-addons");
  const d = {
    config: path.join(root, "config"),
    project: path.join(root, "project"),
    stub: path.join(root, "stub"),
  };
  for (const dir of Object.values(d)) fs.mkdirSync(dir);
  fs.mkdirSync(path.join(d.config, "plugins"));
  fs.writeFileSync(
    path.join(d.config, "plugins/installed_plugins.json"),
    JSON.stringify({ plugins: Object.fromEntries(ids.map((id) => [id, []])) }),
  );
  writeProgram(d.stub, "codegraph", STUB);
  return d;
}

const windows =
  process.platform === "win32"
    ? {
        SystemRoot: process.env.SystemRoot,
        ComSpec: process.env.ComSpec,
        PATHEXT: process.env.PATHEXT,
      }
    : {};
const system =
  process.platform === "win32" ? [`${process.env.SystemRoot}\\System32`] : [];

const run = (d, args, env = {}) =>
  spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: "utf8",
    env: {
      CLAUDE_CONFIG_DIR: d.config,
      CLAUDE_PROJECT_DIR: d.project,
      PATH: [d.stub, ...system].join(path.delimiter),
      STUB_DIR: d.stub,
      ...windows,
      ...env,
    },
  });

const calls = (d) => {
  const file = path.join(d.stub, "calls.log");
  return fs.existsSync(file)
    ? fs
        .readFileSync(file, "utf8")
        .trim()
        .split(/\r?\n/)
        .filter((c) => c !== "--version")
    : [];
};

test("no installed add-on prints one line and runs nothing", () => {
  const d = sandbox(["dotclaude@dotclaude"]);
  const r = run(d, ["--apply"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /No dotclaude add-on is installed/);
  assert.deepEqual(calls(d), []);
});

test("a preview lists the missing index and the missing `agent-browser`, and runs no step", () => {
  const d = sandbox([
    "dotclaude-codegraph@dotclaude",
    "dotclaude-browser@dotclaude",
  ]);
  const r = run(d, []);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /codegraph 9\.9\.9, index missing/);
  assert.match(r.stdout, /npm install -g agent-browser/);
  assert.match(r.stdout, /codegraph init -y/);
  assert.deepEqual(calls(d), []);
});

test("`--apply` runs `codegraph init -y` in the project and no global install", () => {
  const d = sandbox(["dotclaude-codegraph@dotclaude"]);
  assert.equal(run(d, ["--apply"]).status, 0);
  assert.deepEqual(calls(d), ["init -y"]);
});

test("a project with an index gets no step", () => {
  const d = sandbox(["dotclaude-codegraph@dotclaude"]);
  fs.mkdirSync(path.join(d.project, ".codegraph"));
  fs.writeFileSync(path.join(d.project, ".codegraph/codegraph.db"), "");
  const r = run(d, ["--apply"]);
  assert.match(r.stdout, /index built/);
  assert.deepEqual(calls(d), []);
});

test("the Jev line says whether the key is set and never prints the key", () => {
  const d = sandbox(["dotclaude-jev@dotclaude"]);
  assert.match(run(d, []).stdout, /TYPESAFE_API_KEY is not set/);
  const r = run(d, [], { TYPESAFE_API_KEY: "secret-value-123" });
  assert.match(r.stdout, /TYPESAFE_API_KEY is set/);
  assert.doesNotMatch(r.stdout, /secret-value-123/);
});

test("an add-on that the user settings turn off is not checked", () => {
  assert.deepEqual(
    installedAddons(
      {
        plugins: {
          "dotclaude@dotclaude": [],
          "dotclaude-jev@dotclaude": [],
          "dotclaude-lab@dotclaude": [],
          "other@market": [],
        },
      },
      { "dotclaude-jev@dotclaude": false },
    ),
    ["dotclaude-lab"],
  );
});
