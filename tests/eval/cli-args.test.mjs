// The flags of `just eval`, their defaults, and their usage errors.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ARMS, VARIANT_ARMS } from "../../tools/eval/arms.mjs";
import { loadProfile, parseArgs } from "../../tools/eval/cli.mjs";
import {
  EVAL_CONCURRENCY_DEFAULT,
  EVAL_COST_LIMIT_USD,
  EVAL_RUNS_DEFAULT,
} from "../../tools/limits.mjs";

test("no flags give the defaults", () => {
  expect(parseArgs([])).toEqual({
    runs: EVAL_RUNS_DEFAULT,
    limit: EVAL_COST_LIMIT_USD,
    concurrency: EVAL_CONCURRENCY_DEFAULT,
    model: "sonnet",
    claudeVersion: "2.1.295",
    arms: ARMS,
  });
});

test("each flag sets its field", () => {
  const o = parseArgs([
    "--cases",
    "a,b",
    "--runs",
    "5",
    "--limit",
    "2.5",
    "--model",
    "haiku",
    "--profile",
    "p.json",
    "--env",
    "e.env",
    "--out",
    "out",
    "--claude-version",
    "2.1.300",
    "--concurrency",
    "2",
    "--dry-run",
  ]);
  expect(o).toEqual({
    cases: ["a", "b"],
    runs: 5,
    limit: 2.5,
    model: "haiku",
    profile: "p.json",
    env: "e.env",
    out: "out",
    claudeVersion: "2.1.300",
    concurrency: 2,
    dryRun: true,
    arms: ARMS,
  });
});

test("a variant selects the variant arms", () => {
  const o = parseArgs(["--variant", "v.md"]);
  expect(o.variant).toBe("v.md");
  expect(o.arms).toBe(VARIANT_ARMS);
});

test("a bad value, a missing value, or an unknown flag throws", () => {
  expect(() => parseArgs(["--runs", "0"])).toThrow();
  expect(() => parseArgs(["--limit", "x"])).toThrow();
  expect(() => parseArgs(["--model"])).toThrow();
  expect(() => parseArgs(["--nope"])).toThrow();
  expect(() => parseArgs(["toString"])).toThrow();
});

test("`--gated` runs the dotclaude arm against the gated arm of the item", () => {
  expect(parseArgs(["--gated", "nonessential-traffic"]).arms).toEqual([
    "dotclaude",
    "gated-nonessential-traffic",
  ]);
  expect(() => parseArgs(["--gated", "nope"])).toThrow();
  expect(() =>
    parseArgs(["--gated", "telemetry", "--variant", "v.md"]),
  ).toThrow();
});

test("`--gated` with a list runs the dotclaude arm one time against each gated arm", () => {
  expect(parseArgs(["--gated", "telemetry,subagent-cache-1h"]).arms).toEqual([
    "dotclaude",
    "gated-telemetry",
    "gated-subagent-cache-1h",
  ]);
  expect(() => parseArgs(["--gated", "telemetry,nope"])).toThrow();
});

test("`--concurrency` takes a number above 0", () => {
  expect(parseArgs(["--concurrency", "6"]).concurrency).toBe(6);
  expect(() => parseArgs(["--concurrency", "0"])).toThrow();
});

// The `eval-suite` spec: the dotclaude arm loads the settings that setup writes.
test("the dotclaude arm loads the setup profile when `--profile` is not given", () => {
  const profile = loadProfile(parseArgs([]).profile);
  expect(profile.enabledPlugins["cc-plugin-tips@builtin"]).toBe(false);
  expect(profile.$schema).toEndWith("/schemas/claude-code-settings.json");
});

test("`--profile` replaces the setup profile", () => {
  const file = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "dc-profile-")),
    "p.json",
  );
  fs.writeFileSync(file, '{"model":"x"}');
  expect(loadProfile(parseArgs(["--profile", file]).profile)).toEqual({
    model: "x",
  });
});
