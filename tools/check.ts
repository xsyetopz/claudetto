#!/usr/bin/env -S bun --no-env-file
// The gate of `just check` and of CI (design D9 of change `redesign-0-4-0`): lint, the type check, `generate --check`, the tests, validation, the hook lab, and `dry`.
//
//   bun tools/check.ts        run each step
//   bun tools/check.ts --ci   skip each step that needs a file that CI does not have, and name it
//
// The test step also fails and names each test file that runs 0 cases, because the JUnit report of `bun test` leaves such a file out.

import os from "node:os";
import path from "node:path";
import { $ } from "bun";
import { output, REPO, recipe } from "./recipes.ts";

/** The test files of `bun test`, under its root `tests/` of `bunfig.toml`. */
const TEST_FILES =
  "tests/**/*{.test,_test,.spec,_spec}.{ts,tsx,js,jsx,mjs,cjs}";

/** The lines of a passed step that an agent needs. One full pass was about 50 KB, which each later call of an agent reads again. */
const SUMMARY =
  /^(\d+ (pass|fail)|Found \d+ clones.*|✓ No type errors.*|✔ Validation passed)$/;

/** The summary lines of the output `text` of a passed step, with the color codes and the indent removed. */
export const summary = (text: string): string[] =>
  text
    .replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g"), "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => SUMMARY.test(line));

/** The files of `files` that the JUnit report `xml` has no test suite for. */
export const emptyTestFiles = (files: string[], xml: string): string[] => {
  const ran = new Set(
    [...xml.matchAll(/<testsuite\b[^>]*\bfile="([^"]+)"/g)].map((m) => m[1]),
  );
  return files.filter((f) => !ran.has(f)).sort();
};

/** Ends the check with exit code 1 and names each file of `files` that the JUnit report `xml` has no test suite for. */
export const checkEmpty = (files: string[], xml: string): void => {
  const empty = emptyTestFiles(files, xml);
  for (const f of empty) console.error(`${f} runs 0 cases.`);
  if (empty.length) process.exit(1);
};

/** Runs `bun test` with a JUnit report, and fails on a test file with 0 cases. A test run is not a Claude Code session, so the session id stays out. */
const tests = async () => {
  const report = path.join(os.tmpdir(), `claudetto-junit-${process.pid}.xml`);
  const { CLAUDE_CODE_SESSION_ID: _, ...env } = process.env;
  try {
    const text = await output(
      $`bun test --reporter=junit --reporter-outfile=${report} 2>&1`.env(env),
    );
    const files = [...new Bun.Glob(TEST_FILES).scanSync(REPO)];
    checkEmpty(files, await Bun.file(report).text());
    return text;
  } finally {
    await Bun.file(report)
      .delete()
      .catch(() => {});
  }
};

type Step = { name: string; run: () => Promise<string>; ciLacks?: string };

export const STEPS: Step[] = [
  {
    name: "lint",
    run: async () =>
      (await output($`bun run lint 2>&1`)) +
      (await output($`bun run lint:md 2>&1`)),
  },
  {
    name: "typecheck",
    ciLacks: "`.claude-plugin/types/`",
    run: async () =>
      (await output($`bun tools/types.ts 2>&1`)) +
      (await output($`bun run typecheck 2>&1`)),
  },
  {
    name: "generate --check",
    run: () => output($`bun tools/generate/index.ts --check 2>&1`),
  },
  { name: "test", run: tests },
  { name: "validate", run: () => output($`bun run validate 2>&1`) },
  { name: "lab", run: () => output($`bun tools/lab.ts 2>&1`) },
  { name: "dry", run: () => output($`bunx jscpd --no-tips 2>&1`) },
];

/** Runs each step of `steps` in order: a passed step prints its name and count lines, and a failed step prints its full output and ends the script with its exit code. A step with `ciLacks` is skipped when `ci` is set. */
export const runSteps = async (steps: Step[], ci: boolean): Promise<void> => {
  for (const step of steps) {
    if (ci && step.ciLacks) {
      console.log(
        `check: skip ${step.name}, because CI has no ${step.ciLacks}`,
      );
      continue;
    }
    console.log(`check: ${step.name}`);
    for (const line of summary(await step.run())) console.log(`  ${line}`);
  }
};

/** The script: runs `steps` with the arguments `argv`, and ends with the exit code of a failed step. */
export const main = (argv: string[], steps: Step[] = STEPS): Promise<void> =>
  recipe(() => runSteps(steps, argv.includes("--ci")));

if (import.meta.main) await main(process.argv);
