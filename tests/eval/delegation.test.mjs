// The no-delegation arm (spec `eval-suite`): the dotclaude arm with `Agent` denied.
// A fixture run reads the settings that the run loop gives to the runner.

import { expect, test } from "bun:test";
import {
  ARMS,
  armPlan,
  armSettings,
  DELEGATION_ARMS,
  initFaults,
} from "../../tools/eval/arms.mjs";
import { loadCases } from "../../tools/eval/cases.mjs";
import { parseArgs } from "../../tools/eval/cli.mjs";
import { runCase } from "../../tools/eval/run.mjs";
import { done, EVALS, hostExec, init, plugin, say } from "./support.mjs";

const { def, dir } = loadCases(EVALS, ["bugfix-range"])[0];
const profile = { permissions: { deny: ["WebFetch"] } };

/** The settings that the run loop gives to the runner for `arm`. */
async function settingsOf(arm) {
  let seen;
  await runCase(def, {
    arm,
    model: "m",
    profile,
    exec: hostExec,
    caseDir: dir,
    expectedVersion: "2.1.295",
    runner: async (job) => {
      seen = job.settings;
      return { events: [init(plugin), say("x"), done("x")], exitCode: 0 };
    },
  });
  return seen;
}

test("the no-delegation arm config denies `Agent` and keeps the other entries", async () => {
  const s = await settingsOf("no-delegation");
  expect(s.permissions.deny).toEqual(["WebFetch", "Agent"]);
});

test("the dotclaude arm does not deny `Agent`", async () => {
  const s = await settingsOf("dotclaude");
  expect(s.permissions.deny).toEqual(["WebFetch"]);
});

test("the no-delegation arm installs the plugin like the dotclaude arm", () => {
  const nd = armPlan("no-delegation", { model: "m" });
  expect(nd.setup).toEqual(armPlan("dotclaude", { model: "m" }).setup);
  expect(initFaults("no-delegation", init([]), null)).toEqual([
    "The plugin did not load.",
  ]);
});

test("the profile is not changed and an empty profile gets the entry", () => {
  armSettings("no-delegation", {}, profile);
  expect(profile.permissions.deny).toEqual(["WebFetch"]);
  expect(armSettings("no-delegation", {}).permissions.deny).toEqual(["Agent"]);
});

test("`--no-delegation` selects the delegation pair", () => {
  expect(parseArgs(["--no-delegation"]).arms).toBe(DELEGATION_ARMS);
  expect(parseArgs([]).arms).toBe(ARMS);
  expect(() => parseArgs(["--no-delegation", "--variant", "v.md"])).toThrow();
});
