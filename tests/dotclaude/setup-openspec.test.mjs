// Runs of `skills/setup/scripts/openspec.mjs` for the OpenSpec steps (task 15.4).
// The `openspec` here is a STUB shell script in a temporary `bin` folder.
// It logs each call to `calls.log`, and keeps `delivery` and `telemetry.enabled` in files.
// The real CLI run is in the task 15.4 evidence.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { PLUGINS, tmpDir } from "../support/repo.mjs";

const PLUGIN = path.join(PLUGINS, "dotclaude");
const SCRIPT = path.join(PLUGIN, "skills/setup/scripts/openspec.mjs");
const NODE = process.execPath;
const STUB = `#!/bin/sh
echo "$*" >> "$STUB_DIR/calls.log"
case "$1 $2" in
  "--version "*) echo 1.14.1 ;;
  "config get") [ -f "$STUB_DIR/$3" ] && { read -r v < "$STUB_DIR/$3"; echo "$v"; } ;;
  "config set") echo "$4" > "$STUB_DIR/$3" ;;
esac
exit 0
`;

/** A temporary config folder, project folder, and stub folder. */
function sandbox() {
  const root = tmpDir("dc-openspec");
  const dirs = {
    root,
    config: path.join(root, "config"),
    project: path.join(root, "project"),
    stub: path.join(root, "stub"),
  };
  for (const d of [dirs.config, dirs.project, dirs.stub]) fs.mkdirSync(d);
  fs.writeFileSync(path.join(dirs.stub, "openspec"), STUB, { mode: 0o755 });
  return dirs;
}

const setup = (d, args) => {
  const r = spawnSync(NODE, [SCRIPT, ...args], {
    encoding: "utf8",
    env: {
      CLAUDE_CONFIG_DIR: d.config,
      CLAUDE_PROJECT_DIR: d.project,
      PATH: d.stub,
      STUB_DIR: d.stub,
    },
    cwd: d.project,
  });
  return { code: r.status, out: r.stdout };
};
/** The calls that change something: no `--version`, and no `config get`. */
const calls = (d) => {
  const file = path.join(d.stub, "calls.log");
  return fs.existsSync(file)
    ? fs
        .readFileSync(file, "utf8")
        .trim()
        .split("\n")
        .filter((c) => c !== "--version" && !c.startsWith("config get"))
    : [];
};

test("the preview lists the OpenSpec steps and runs none", () => {
  const d = sandbox();
  const r = setup(d, []);
  assert.ok(r.out.includes("config set telemetry.enabled false"), r.out);
  assert.ok(r.out.includes("openspec init --tools claude"), r.out);
  assert.ok(r.out.includes("config set delivery skills"), r.out);
  assert.ok(r.out.includes("openspec update"), r.out);
  assert.deepEqual(calls(d), []);
  assert.equal(fs.existsSync(path.join(d.stub, "delivery")), false);
  fs.rmSync(d.root, { recursive: true });
});

test("`--apply` runs init, then the delivery and the update, with telemetry off first", () => {
  const d = sandbox();
  const r = setup(d, ["--apply"]);
  assert.equal(r.code, 0);
  assert.deepEqual(calls(d), [
    "config set telemetry.enabled false",
    "init --tools claude --no-animation",
    "config set delivery skills",
    "update",
  ]);
  fs.rmSync(d.root, { recursive: true });
});

test("a project with skills delivery, telemetry off, and no command copies needs no step", () => {
  const d = sandbox();
  fs.mkdirSync(path.join(d.project, "openspec"));
  fs.writeFileSync(path.join(d.stub, "delivery"), "skills\n");
  fs.writeFileSync(path.join(d.stub, "telemetry.enabled"), "false\n");
  const r = setup(d, ["--apply"]);
  assert.ok(!r.out.includes("OpenSpec steps"), r.out);
  assert.equal(
    calls(d).some((c) => c.startsWith("update")),
    false,
  );
  fs.rmSync(d.root, { recursive: true });
});

test("command copies in `.claude/commands/opsx` need only an `update`", () => {
  const d = sandbox();
  fs.mkdirSync(path.join(d.project, "openspec"));
  fs.mkdirSync(path.join(d.project, ".claude/commands/opsx"), {
    recursive: true,
  });
  fs.writeFileSync(path.join(d.project, ".claude/commands/opsx/apply.md"), "");
  fs.writeFileSync(path.join(d.stub, "delivery"), "skills\n");
  fs.writeFileSync(path.join(d.stub, "telemetry.enabled"), "false\n");
  setup(d, ["--apply"]);
  assert.deepEqual(calls(d), ["update"]);
  fs.rmSync(d.root, { recursive: true });
});
