// Failures of the command hooks of dotclaude-codegraph: a bad payload is ignored, and a crash is reported on stderr.
// Both leave stdout empty and the exit code 0, so a hook never blocks a call.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import os from "node:os";
import { test } from "node:test";
import { parseJson } from "../../plugins/dotclaude-codegraph/features/graph/rules.mjs";
import { CLI, setUp } from "./fake-cli.mjs";

/** Runs the hook `mode` with the raw text `input` on stdin. */
function run(mode, input, env) {
  return spawnSync(process.execPath, [CLI, mode], {
    input,
    cwd: os.tmpdir(),
    env,
    encoding: "utf8",
  });
}

test("a payload that is not JSON is ignored with no output and no error text", () => {
  const t = setUp();
  const r = run("search", "{not json", t.env);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
  assert.equal(r.stderr, "");
});

test("a crash of the hook is written to stderr, and the exit code stays 0", () => {
  const t = setUp();
  // A `cwd` that is not text makes the path join throw a `TypeError`.
  const r = run("search", JSON.stringify({ cwd: 5 }), t.env);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, /TypeError/);
});

test("`parseJson` gives null for text that is not JSON and throws any other error", () => {
  assert.equal(parseJson("not json"), null);
  assert.deepEqual(parseJson('{"a":1}'), { a: 1 });
  assert.throws(() => parseJson(Symbol("x")), TypeError);
});
