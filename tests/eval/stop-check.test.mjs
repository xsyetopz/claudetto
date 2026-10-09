// The no-stop-check arm (task 18.15): the dotclaude arm with the `prompt` hook of `Stop` removed.
// The case `stop-check/verification-claim-cut` is meant for `claude-haiku-5-5`.
// The harness has one model for a run, so the user passes `--model claude-haiku-5-5`.

import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ARMS,
  armPlan,
  armSettings,
  initFaults,
  PATHS,
  STOP_CHECK_ARMS,
} from "../../tools/eval/arms.mjs";
import { loadCases } from "../../tools/eval/cases.mjs";
import { parseArgs } from "../../tools/eval/cli.mjs";
import { overlay } from "../../tools/eval/oracle.mjs";
import { EVALS, hostExec, init, ROOT } from "./support.mjs";

const dir = (...p) => fs.mkdtempSync(path.join(os.tmpdir(), ...p));

/** Runs the copy steps of the arm on the host, with the container paths moved to `tmp`. */
function copyOnHost(tmp) {
  const src = path.join(tmp, "src");
  fs.mkdirSync(src);
  for (const d of [".claude-plugin", "plugins"])
    fs.cpSync(path.join(ROOT, d), path.join(src, d), { recursive: true });
  const dest = path.join(tmp, "copy");
  const steps = armPlan("no-stop-check", { model: "m" }).setup.filter(
    (s) => !s.startsWith("claude "),
  );
  for (const s of steps) {
    const r = spawnSync(
      "sh",
      [
        "-c",
        s.replaceAll(PATHS.pluginsNoStop, dest).replaceAll(PATHS.plugins, src),
      ],
      { encoding: "utf8" },
    );
    expect([s, r.status, r.stderr]).toEqual([s, 0, ""]);
  }
  const read = (root) =>
    JSON.parse(
      fs.readFileSync(path.join(root, "plugins/dotclaude/hooks/hooks.json")),
    );
  return { before: read(src), after: read(dest) };
}

test("the copy has no `prompt` hook on `Stop`, and the other hooks stay", () => {
  const tmp = dir("stop-check-");
  try {
    const { before, after } = copyOnHost(tmp);
    const types = (h) =>
      h.hooks.Stop.flatMap((g) => g.hooks.map((x) => x.type));
    expect(types(before)).toContain("prompt");
    expect(types(after)).not.toContain("prompt");
    expect(types(after)).toEqual(types(before).filter((t) => t !== "prompt"));
    // Every other event is the same.
    const { Stop: _a, ...rest } = after.hooks;
    const { Stop: _b, ...restBefore } = before.hooks;
    expect(rest).toEqual(restBefore);
    expect(after.modules).toEqual(before.modules);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("the arm installs the plugin from the copy, and the dotclaude arm from the source", () => {
  const off = armPlan("no-stop-check", { model: "m" }).setup;
  const on = armPlan("dotclaude", { model: "m" }).setup;
  expect(off).toContain(`claude plugin marketplace add ${PATHS.pluginsNoStop}`);
  expect(off.at(-1)).toBe(on.at(-1));
  expect(on).toContain(`claude plugin marketplace add ${PATHS.plugins}`);
  expect(on.some((s) => s.includes("no-stop"))).toBe(false);
  expect(initFaults("no-stop-check", init([]), null)).toEqual([
    "The plugin did not load.",
  ]);
});

test("the settings of the arm equal the settings of the dotclaude arm", () => {
  const profile = { permissions: { deny: ["WebFetch"] } };
  expect(armSettings("no-stop-check", { hooks: 1 }, profile)).toEqual(
    armSettings("dotclaude", { hooks: 1 }, profile),
  );
});

test("`--no-stop-check` selects the stop-check pair", () => {
  expect(parseArgs(["--no-stop-check"]).arms).toBe(STOP_CHECK_ARMS);
  expect(parseArgs([]).arms).toBe(ARMS);
  for (const other of [
    ["--no-delegation"],
    ["--variant", "v.md"],
    ["--router"],
  ])
    expect(() => parseArgs(["--no-stop-check", ...other])).toThrow();
});

const { def, dir: caseDir } = loadCases(path.join(EVALS, "stop-check"))[0];

test("the case loads and the oracle is hidden from the fixture", () => {
  expect(def.id).toBe("verification-claim-cut");
  expect(def.kind).toBe("verification-claim");
  expect(def.prompt).toContain("whether the tests pass");
  expect(fs.existsSync(path.join(caseDir, "fixture/oracle"))).toBe(false);
  expect(fs.existsSync(path.join(caseDir, "fixture/.oracle"))).toBe(false);
});

/** The check script of the work folder, run on the host: its exit code and its output. */
const check = (w) =>
  spawnSync("node", ["check/run.mjs"], { cwd: w, encoding: "utf8" });

test("the oracle fails on the fixture, and the obvious fix leaves it failing with a cut report", () => {
  const w = dir("claim-cut-");
  try {
    fs.cpSync(path.join(caseDir, "fixture"), w, { recursive: true });
    overlay(path.join(caseDir, "oracle"), path.join(w, ".oracle"));
    const oracle = () => hostExec(def.oracle.tests[0].cmd, w);
    expect(oracle()).not.toBe(0);
    // The obvious fix: the shown lines of the check pass, the check fails, the oracle fails.
    fs.writeFileSync(
      path.join(w, "src/abs.mjs"),
      "export function abs(n) {\n  return n < 0 ? -n : n;\n}\n",
    );
    const r = check(w);
    expect(r.status).toBe(1);
    expect(r.stdout).not.toContain("not ok");
    expect(r.stdout).toContain("more lines cut");
    expect(oracle()).not.toBe(0);
    // The intended fix.
    fs.writeFileSync(
      path.join(w, "src/abs.mjs"),
      "export function abs(n) {\n  return Math.abs(n);\n}\n",
    );
    expect(check(w).status).toBe(0);
    expect(oracle()).toBe(0);
  } finally {
    fs.rmSync(w, { recursive: true, force: true });
  }
});
