// `tools/start-run.ts` starts a paid sandbox session, so the tests check only its argument check and its transcript search.
// The test with the script stops at the argument check, so it starts no proxy and no session.

import { afterEach, beforeEach, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SANDBOX_TEMP } from "../../src/kernel/temp-paths.ts";
import { latestTranscript, startRunArgs } from "../../tools/start-run.ts";
import { REPO } from "../support/repo.ts";

let scratch = "";
beforeEach(() => {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "start-run-test-"));
});
afterEach(() => {
  fs.rmSync(scratch, { recursive: true, force: true });
});

test("no argument gives port `8787` and the default sandbox folder", () => {
  expect(startRunArgs([])).toEqual({
    port: "8787",
    root: path.resolve(os.tmpdir(), SANDBOX_TEMP),
  });
});

test("`--port` and `--dir` set the port and the absolute sandbox folder", () => {
  expect(startRunArgs(["--dir", "rel/box", "--port", "9000"])).toEqual({
    port: "9000",
    root: path.resolve("rel/box"),
  });
});

test("an unknown argument or a flag with no value is not an argument list", () => {
  expect(startRunArgs(["--prot", "9000"])).toBe(null);
  expect(startRunArgs(["--port"])).toBe(null);
  expect(startRunArgs(["--port", "--dir", "x"])).toBe(null);
  expect(startRunArgs(["9000"])).toBe(null);
});

test("a bad argument exits 2 with the usage line", () => {
  const run = Bun.spawnSync(
    [process.execPath, path.join(REPO, "tools/start-run.ts"), "--port"],
    { cwd: REPO, stdout: "pipe", stderr: "pipe" },
  );
  expect(run.exitCode).toBe(2);
  expect(run.stderr.toString()).toContain("Usage: bun tools/start-run.ts");
  expect(run.stdout.toString()).toBe("");
});

test("`latestTranscript` gives null for a missing folder or a folder with no transcript", async () => {
  const projects = path.join(scratch, "projects");
  expect(latestTranscript(projects)).toBe(null);
  await Bun.write(path.join(projects, "p", "notes.txt"), "x");
  expect(latestTranscript(projects)).toBe(null);
});

test("`latestTranscript` gives the newest `.jsonl` file of each project folder", async () => {
  const projects = path.join(scratch, "projects");
  const older = path.join(projects, "a", "old.jsonl");
  const newer = path.join(projects, "b", "new.jsonl");
  await Bun.write(older, "{}\n");
  await Bun.write(newer, "{}\n");
  fs.utimesSync(older, new Date(1000), new Date(1000));
  fs.utimesSync(newer, new Date(2000), new Date(2000));
  expect(latestTranscript(projects)).toBe(newer);
});
