// The add-on pair (task 17.7): the dotclaude arm with the case add-ons, and the dotclaude arm without them.
// The code-graph hooks run only with the `codegraph` CLI and a `.codegraph/` index, so the image pins the CLI and the setup builds the index.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  ADDON_ARMS,
  ARMS,
  armPlan,
  armSettings,
  initFaults,
} from "../../tools/eval/arms.mjs";
import { loadCases } from "../../tools/eval/cases.mjs";
import { parseArgs } from "../../tools/eval/cli.mjs";
import { runCase } from "../../tools/eval/run.mjs";
import { done, EVALS, hostExec, init, plugin, say } from "./support.mjs";

const ADDON = "dotclaude-codegraph";
const INDEX = "codegraph init -y";
const plan = (arm, addons = [ADDON]) =>
  armPlan(arm, { model: "m", addons }).setup;

test("the Dockerfile pins the `codegraph` CLI to an exact version", () => {
  const file = fs.readFileSync(
    path.join(import.meta.dirname, "../../tools/eval/container/Dockerfile"),
    "utf8",
  );
  expect(file).toMatch(/^ARG CODEGRAPH_VERSION=\d+\.\d+\.\d+$/m);
  expect(file).toContain("@colbymchenry/codegraph@${CODEGRAPH_VERSION}");
});

test("the dotclaude arm installs the add-on and builds the index after the installs", () => {
  const setup = plan("dotclaude");
  expect(setup).toContain(`claude plugin install ${ADDON}@dotclaude`);
  expect(setup.at(-1)).toBe(INDEX);
});

test("the no-addons arm has the plugin, no add-on, and no index", () => {
  const setup = plan("no-addons");
  expect(setup).toContain("claude plugin install dotclaude@dotclaude");
  expect(setup.some((s) => s.includes(ADDON))).toBe(false);
  expect(setup).not.toContain(INDEX);
  expect(setup).toEqual(plan("dotclaude", []).filter((s) => s !== INDEX));
});

test("a dotclaude arm with no code-graph add-on builds no index", () => {
  expect(plan("dotclaude", [])).not.toContain(INDEX);
  expect(plan("dotclaude", ["dotclaude-jev"])).not.toContain(INDEX);
  expect(plan("vanilla")).toEqual([]);
});

test("the settings and the init check of the no-addons arm equal those of the dotclaude arm", () => {
  const profile = { permissions: { deny: ["WebFetch"] } };
  expect(armSettings("no-addons", { hooks: 1 }, profile)).toEqual(
    armSettings("dotclaude", { hooks: 1 }, profile),
  );
  expect(initFaults("no-addons", init([]), null)).toEqual([
    "The plugin did not load.",
  ]);
  expect(initFaults("no-addons", init(plugin), null)).toEqual([]);
});

test("`--no-addons` selects the add-on pair, and conflicts with the other pairs", () => {
  expect(parseArgs(["--no-addons"]).arms).toBe(ADDON_ARMS);
  expect(parseArgs([]).arms).toBe(ARMS);
  for (const other of [
    ["--no-delegation"],
    ["--no-stop-check"],
    ["--variant", "v.md"],
    ["--router"],
    ["--gated", "x"],
  ])
    expect(() => parseArgs(["--no-addons", ...other])).toThrow();
  expect(parseArgs(["--no-addons", "--suite", "code-graph"]).suite).toBe(
    "code-graph",
  );
});

test("the case asks for the add-on, and the fixture and oracle hold no index", () => {
  const { def, dir } = loadCases(path.join(EVALS, "code-graph"))[0];
  expect(def.addons).toEqual([ADDON]);
  expect(fs.existsSync(path.join(dir, "fixture/.codegraph"))).toBe(false);
  expect(fs.existsSync(path.join(dir, "fixture/.oracle"))).toBe(false);
});

test("the index that the setup writes is not tamper", async () => {
  const { def, dir } = loadCases(path.join(EVALS, "code-graph"))[0];
  const rec = await runCase(def, {
    arm: "dotclaude",
    model: "m",
    exec: hostExec,
    caseDir: dir,
    expectedVersion: "2.1.295",
    runner: async (job) => {
      fs.mkdirSync(path.join(job.workDir, ".codegraph"));
      fs.writeFileSync(path.join(job.workDir, ".codegraph/codegraph.db"), "x");
      return { events: [init(plugin), say("x"), done("x")] };
    },
  });
  expect(rec.tamper).toBe(false);
});
