// The kept work of a run: the files that the run changed and its events, in the results folder.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadCases } from "../../tools/eval/cases.mjs";
import { runCase } from "../../tools/eval/run.mjs";
import {
  done,
  EVALS,
  fakeRunner,
  hostExec,
  init,
  plugin,
  say,
  write,
} from "./support.mjs";

const { def, dir } = loadCases(EVALS, ["bugfix-range"])[0];
const events = [init(plugin), say("fixed"), done("fixed")];
const go = (opts) =>
  runCase(def, {
    arm: "dotclaude",
    model: "m",
    runner: fakeRunner(events, (job) =>
      write(job, "src/range.mjs", "export const range = () => [];\n"),
    ),
    exec: hostExec,
    caseDir: dir,
    expectedVersion: "2.1.295",
    run: 2,
    ...opts,
  });

test("with a results folder, a run keeps its changed files and its events", async () => {
  const keepDir = fs.mkdtempSync(path.join(os.tmpdir(), "eval-keep-"));
  try {
    const r = await go({ keepDir });
    const kept = path.join(keepDir, "work", "bugfix-range-dotclaude-2");
    expect(r.kept).toBe(kept);
    expect(fs.readFileSync(path.join(kept, "src/range.mjs"), "utf8")).toBe(
      "export const range = () => [];\n",
    );
    const lines = fs
      .readFileSync(path.join(kept, "events.jsonl"), "utf8")
      .trim()
      .split("\n");
    expect(lines.map((l) => JSON.parse(l))).toEqual(events);
  } finally {
    fs.rmSync(keepDir, { recursive: true, force: true });
  }
});

test("a file that the run did not change is not kept", async () => {
  const keepDir = fs.mkdtempSync(path.join(os.tmpdir(), "eval-keep-"));
  try {
    const r = await go({ keepDir });
    const files = fs.readdirSync(r.kept, { recursive: true });
    expect(files.sort()).toEqual(["events.jsonl", "src", "src/range.mjs"]);
  } finally {
    fs.rmSync(keepDir, { recursive: true, force: true });
  }
});

test("with no results folder, a run keeps nothing", async () => {
  expect((await go({})).kept).toBeNull();
});
