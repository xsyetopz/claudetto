// Failures of the command hooks of dotclaude-codegraph: a bad payload is ignored, and a crash is reported on stderr.
// Both leave stdout empty and the exit code 0, so a hook never blocks a call.

import { expect, test } from "bun:test";
import os from "node:os";
import { parseJson } from "../../plugins/dotclaude-codegraph/slices/graph/domain/graph.ts";
import type { Env } from "../support/repo.ts";
import { CLI, setUp } from "./fake-cli.ts";

/** Runs the hook `mode` with the raw text `input` on stdin. */
const run = (mode: string, input: string, env: Env) => {
  const r = Bun.spawnSync({
    cmd: [process.execPath, "--no-env-file", CLI, mode],
    stdin: Buffer.from(input),
    cwd: os.tmpdir(),
    env,
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    status: r.exitCode,
    stdout: r.stdout.toString(),
    stderr: r.stderr.toString(),
  };
};

test("a payload that is not JSON is ignored with no output and no error text", async () => {
  const t = await setUp();
  const r = run("session-start", "{not json", t.env);
  expect(r.status).toBe(0);
  expect(r.stdout).toBe("");
  expect(r.stderr).toBe("");
});

test("a crash of the hook is written to stderr, and the exit code stays 0", async () => {
  const t = await setUp();
  // A `cwd` that is not text makes the path join throw a `TypeError`.
  const r = run("session-start", JSON.stringify({ cwd: 5 }), t.env);
  expect(r.status).toBe(0);
  expect(r.stdout).toBe("");
  expect(r.stderr).toMatch(/TypeError/);
});

test("`parseJson` gives `null` for text that is not JSON and throws any other error", () => {
  expect(parseJson("not json")).toBe(null);
  expect<unknown>(parseJson('{"a":1}')).toStrictEqual({ a: 1 });
  expect(() => parseJson(Symbol("x") as unknown as string)).toThrow(TypeError);
});
