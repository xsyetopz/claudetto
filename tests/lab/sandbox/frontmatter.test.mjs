// Pins `dotclaude-sandbox --check-frontmatter`: it runs one headless session with a debug log,
// prints each line that names an unknown frontmatter field, and exits 1 when there is one.
// A fake `claude` first on `PATH` writes the debug file, so no test starts Claude Code.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { PLUGINS, tmpDir } from "../../support/repo.mjs";

const LAB = path.join(PLUGINS, "dotclaude-lab");
const UNKNOWN = "[WARN] agents/x.md: unknown frontmatter field `foo`";

// Writes `FAKE_LOG_TEXT` to the file after `--debug-file`, and records its arguments.
// Exits with `FAKE_EXIT`.
const FAKE_CLAUDE = `#!${process.execPath}
const fs = require("node:fs");
const argv = process.argv.slice(2);
fs.writeFileSync(process.env.FAKE_OUT, JSON.stringify(argv));
if (process.env.FAKE_LOG_TEXT !== undefined)
  fs.writeFileSync(argv[argv.indexOf("--debug-file") + 1], process.env.FAKE_LOG_TEXT);
process.exit(Number(process.env.FAKE_EXIT ?? 0));
`;

function setUp() {
  const dir = tmpDir("lab-frontmatter");
  const claude = path.join(dir, "claude");
  fs.writeFileSync(claude, FAKE_CLAUDE, { mode: 0o755 });
  return { dir, claude, out: path.join(dir, "out.json") };
}

function run(s, env, lab = LAB) {
  const r = spawnSync(
    process.execPath,
    [
      path.join(lab, "bin/dotclaude-sandbox"),
      "--dir",
      path.join(s.dir, "sandbox"),
      "--check-frontmatter",
    ],
    {
      env: {
        ...process.env,
        PATH: `${s.dir}${path.delimiter}${process.env.PATH}`,
        CLAUDE_CODE_OAUTH_TOKEN: "t",
        FAKE_OUT: s.out,
        ...env,
      },
      encoding: "utf8",
    },
  );
  return r;
}

test("a log with no unknown-field line passes", () => {
  const s = setUp();
  const r = run(s, { FAKE_LOG_TEXT: "[DEBUG] loaded 3 agents\n" });
  assert.equal(r.status, 0, r.stderr);
  const argv = JSON.parse(fs.readFileSync(s.out, "utf8"));
  assert.ok(argv.includes("--debug-file"));
  assert.deepEqual(argv.slice(-2), ["-p", "Reply with OK."]);
  assert.ok(!argv.includes("--check-frontmatter"));
});

test("a log with an unknown-field line fails and the output names the line", () => {
  const s = setUp();
  const r = run(s, { FAKE_LOG_TEXT: `[DEBUG] loaded\n${UNKNOWN}\n` });
  assert.equal(r.status, 1, r.stderr);
  assert.ok(r.stdout.includes(UNKNOWN), r.stdout);
});

test("a failed session fails the check", () => {
  const s = setUp();
  const r = run(s, { FAKE_LOG_TEXT: "", FAKE_EXIT: "3" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /\b3\b/);
});

test("a session with no debug log fails the check", () => {
  const s = setUp();
  const r = run(s, {});
  assert.equal(r.status, 1);
});

test("mutation: a check that ignores the log would pass the unknown-field log", () => {
  const s = setUp();
  const copy = path.join(s.dir, "lab");
  fs.cpSync(LAB, copy, { recursive: true });
  const file = path.join(copy, "features/sandbox/frontmatter.mjs");
  const source = fs.readFileSync(file, "utf8");
  const mutated = source.replace("hits.length === 0 ? 0 : 1", "0");
  assert.notEqual(mutated, source, "the mutation must change the file");
  fs.writeFileSync(file, mutated);
  const env = { FAKE_LOG_TEXT: `${UNKNOWN}\n` };
  assert.equal(run(s, env, copy).status, 0);
  assert.equal(run(s, env).status, 1);
});
