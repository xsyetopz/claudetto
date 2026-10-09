// The style arms of task 23.3: `vanilla-concise` and one `dotclaude` arm for each style file.

import { expect, test } from "bun:test";
import { parseArgs } from "../../tools/eval/args.mjs";
import {
  armPlan,
  armSettings,
  initFaults,
  PATHS,
} from "../../tools/eval/arms.mjs";
import { loadCases } from "../../tools/eval/cases.mjs";
import { runCase } from "../../tools/eval/run.mjs";
import { EVALS, hostExec, init } from "./support.mjs";

const hook = { hooks: { PreToolUse: [] } };
const profile = { autoCompactEnabled: false };

test("`--styles` runs `dotclaude`, `vanilla-concise`, and one arm for each style", () => {
  expect(parseArgs(["--styles", "full,short"]).arms).toEqual([
    "dotclaude",
    "vanilla-concise",
    "style-full",
    "style-short",
  ]);
});

test("`--styles` with another arm flag stops before a run", () => {
  expect(() => parseArgs(["--styles", "a", "--no-delegation"])).toThrow();
});

test("a style name with a path part stops before a run", () => {
  expect(() => parseArgs(["--styles", "../x"])).toThrow();
});

test("the `vanilla-concise` arm selects the built-in `Concise` style and installs no plugin", () => {
  expect(armSettings("vanilla-concise", hook, profile)).toEqual({
    ...hook,
    outputStyle: "Concise",
  });
  expect(armPlan("vanilla-concise", { model: "m" }).setup).toEqual([]);
});

test("a style arm installs a copy of the plugins with the style file in place of the `dotclaude` style", () => {
  const { setup } = armPlan("style-short", { model: "m" });
  const style = `${PATHS.pluginsStyle}/plugins/dotclaude/output-styles/dotclaude.md`;
  const put = setup.indexOf(`cp ${PATHS.style} ${style}`);
  const install = setup.indexOf(
    `claude plugin marketplace add ${PATHS.pluginsStyle}`,
  );
  expect(put).toBeGreaterThanOrEqual(0);
  expect(install).toBeGreaterThan(put);
  expect(armSettings("style-short", hook, profile)).toEqual({
    ...profile,
    ...hook,
  });
});

test("a `vanilla-concise` run with another output style is a fault", () => {
  expect(initFaults("vanilla-concise", init([]))).not.toEqual([]);
  expect(
    initFaults("vanilla-concise", { ...init([]), output_style: "Concise" }),
  ).toEqual([]);
});

test("a style run gives the runner the file of its style", async () => {
  const [{ def, dir }] = loadCases(EVALS, ["neutral-question"]);
  let seen;
  await runCase(def, {
    arm: "style-short",
    model: "m",
    exec: hostExec,
    caseDir: dir,
    stylesDir: "/styles",
    runner: async (job) => {
      seen = job.stylePath;
      return { events: [init([{ name: "dotclaude" }])], exitCode: 0 };
    },
  });
  expect(seen).toBe("/styles/short.md");
});
