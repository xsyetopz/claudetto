// Tests of the arguments and the missing folders of `dotclaude-usage` and `dotclaude-start`:
// a bad `--days` or `--bound` is a usage error, and a folder of transcripts that is absent means no sessions.

import { expect, test } from "bun:test";
import path from "node:path";
import { PLUGINS, tmpDir } from "../../support/repo.ts";
import { runBin } from "../spawn.ts";

const USAGE_BIN = path.join(
  PLUGINS,
  "dotclaude-sessions",
  "bin",
  "dotclaude-usage",
);
const START_BIN = path.join(
  PLUGINS,
  "dotclaude-sessions",
  "bin",
  "dotclaude-start",
);

test("`dotclaude-usage` exits 2 for a `--days` that is not a positive whole number", () => {
  const root = tmpDir("usage-days");
  for (const days of ["abc", "0", "-3", "1.5"]) {
    const out = runBin(USAGE_BIN, ["--root", root, "--days", days]);
    expect(out.status).toBe(2);
  }
});

test("`dotclaude-usage` exits 2 for a `--runs` that is not a positive whole number", () => {
  const root = tmpDir("usage-runs");
  for (const runs of ["abc", "0", "-3", "1.5"]) {
    const out = runBin(USAGE_BIN, ["--root", root, "--runs", runs]);
    expect(out.status).toBe(2);
  }
});

test("`dotclaude-usage` exits 2 for a `--window` that is not a positive whole number", () => {
  const root = tmpDir("usage-window");
  for (const window of ["abc", "0", "-3", "1.5"]) {
    const out = runBin(USAGE_BIN, ["--root", root, "--window", window]);
    expect(out.status).toBe(2);
  }
});

test("`dotclaude-usage` exits 0 for a `--runs` and a `--window` that are positive whole numbers", () => {
  const root = path.join(tmpDir("usage-valid"), "projects");
  const out = runBin(USAGE_BIN, [
    "--root",
    root,
    "--runs",
    "5",
    "--window",
    "200000",
    "--json",
  ]);
  expect(out.status).toBe(0);
});

test("`dotclaude-usage` treats an absent `--root` as no sessions and exits 0", () => {
  const root = path.join(tmpDir("usage-absent"), "projects");
  const out = runBin(USAGE_BIN, ["--root", root, "--json"]);
  expect(out.status).toBe(0);
});

test("`dotclaude-usage` treats an absent default folder as no sessions and exits 0", () => {
  const config = path.join(tmpDir("usage-config"), "none");
  const env = { ...process.env, CLAUDE_CONFIG_DIR: config };
  expect(runBin(USAGE_BIN, [], env).status).toBe(0);
});

test("`dotclaude-start` exits 2 for a `--bound` that is not a number", async () => {
  const file = path.join(tmpDir("start-bound"), "session.jsonl");
  await Bun.write(file, "");
  expect(runBin(START_BIN, [file, "--bound", "abc"]).status).toBe(2);
});

test("`dotclaude-start` exits 2 with no transcript when the default folder is absent", () => {
  const config = path.join(tmpDir("start-config"), "none");
  const env = { ...process.env, CLAUDE_CONFIG_DIR: config };
  expect(runBin(START_BIN, [], env).status).toBe(2);
});
