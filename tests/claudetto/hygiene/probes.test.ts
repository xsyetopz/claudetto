// The workaround for anthropics/claude-code#104170 (spec `session-hygiene`, "Leaked Probe Folders").
// The test runs the real `find` of `sweepArgv` on a fake temp folder, so it checks the flags on this system.

import { afterAll, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, utimesSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  removedCount,
  sweepArgv,
} from "../../../plugins/claudetto/slices/hygiene/domain/probes.ts";
import { PROBE_MAX_AGE_MIN } from "../../../plugins/claudetto/slices/hygiene/limits.ts";

const base = mkdtempSync(path.join(tmpdir(), "hygiene-"));
afterAll(() => rmSync(base, { recursive: true, force: true }));

test("Old Probe, Running Probe, and Unknown Folder: only a probe folder over the age goes", async () => {
  const root = path.join(base, `claude-${process.getuid?.() ?? 0}`);
  const old = (Date.now() - (PROBE_MAX_AGE_MIN + 60) * 60_000) / 1000;
  for (const name of [
    "fswatch-probe-old1",
    "fswatch-probe-old2",
    "fswatch-probe-new",
    "tscheck",
  ]) {
    mkdirSync(path.join(root, name, "x"), { recursive: true });
    if (name !== "fswatch-probe-new")
      utimesSync(path.join(root, name), old, old);
  }
  const run = Bun.spawnSync(sweepArgv(`${base}/`));
  expect(run.exitCode).toBe(0);
  expect(removedCount(run.stdout.toString())).toBe(2);
  expect((await readdir(root)).sort()).toStrictEqual([
    "fswatch-probe-new",
    "tscheck",
  ]);
});

test("a temp folder of Claude Code that does not exist removes nothing", () => {
  const run = Bun.spawnSync(sweepArgv(path.join(base, "none")));
  expect(removedCount(run.stdout.toString())).toBe(0);
});
