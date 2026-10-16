// Regression tests for the ask on a weaker CI file (package P36).
// Each weakening step asks, and an added check step gets no ask.
// Files are strings and no file is read.

import { expect, test } from "bun:test";
import { writeAsks } from "../../calls.ts";

const CI = "/w/.github/workflows/ci.yml";
const BASE = `name: ci
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: bun test
`;

const withStep = (step: string): string =>
  BASE.replace(
    "      - run: bun test\n",
    `      ${step}\n      - run: bun test\n`,
  );

const WEAKENING_STEPS = [
  'run: echo "SKIP=1" >> $GITHUB_ENV',
  "run: git checkout origin/main -- tests",
  "run: sed -i s/expect/noop/ tests/a.ts",
];

test.each(WEAKENING_STEPS)(
  "an added CI step `%s` before the test step gets an ask",
  async (step) => {
    expect(await writeAsks(CI, BASE, withStep(`- ${step}`))).toBe(true);
  },
);

test("an added CI step `run: bun test` gets no ask", async () => {
  expect(await writeAsks(CI, BASE, withStep("- run: bun test"))).toBe(false);
});
