// Review payloads for the ask on a weaker CI file (package P36).
// A call asks unless every changed part is an added step or job with no `if`, `continue-on-error`, `timeout-minutes`, `shell`, or failing `run`, a `name` change, or a format change.
// Files are strings and no file is read.

import { expect, test } from "bun:test";
import { editAsks, writeAsks } from "../calls.ts";

/** `[title, file, text, old, new]` for an `Edit` that must get an ask. */
type Case = [string, string, string, string, string];

const CI = "/w/.github/workflows/ci.yml";
const BASE =
  "jobs:\n  t:\n    runs-on: ubuntu\n    steps:\n      - uses: actions/checkout@v4\n      - run: just check\n";

const ASKS: Case[] = [
  [
    "ci rm step",
    "/w/.github/workflows/ci.yml",
    "jobs:\n  t:\n    steps:\n      - run: just check\n      - run: just lint\n",
    "      - run: just lint\n",
    "",
  ],
  [
    "ci coe",
    "/w/.github/workflows/ci.yml",
    "jobs:\n  t:\n    steps:\n      - run: just check\n",
    "      - run: just check\n",
    "      - run: just check\n        continue-on-error: true\n",
  ],
  [
    "ci ||true",
    "/w/.github/workflows/ci.yml",
    "jobs:\n  t:\n    steps:\n      - run: just check\n",
    "just check",
    "just check || true",
  ],
  [
    "ci if false",
    "/w/.github/workflows/ci.yml",
    "jobs:\n  t:\n    steps:\n      - run: just check\n",
    "      - run: just check\n",
    "      - if: false\n        run: just check\n",
  ],
  [
    "ci echo",
    "/w/.github/workflows/ci.yml",
    "jobs:\n  t:\n    steps:\n      - run: just check\n",
    "just check",
    "echo ok",
  ],
  [
    "ci matrix",
    "/w/.github/workflows/ci.yml",
    "jobs:\n  t:\n    strategy:\n      matrix:\n        os: [linux, mac]\n    steps:\n      - run: just check\n",
    "[linux, mac]",
    "[linux]",
  ],
  [
    "ci on",
    "/w/.github/workflows/ci.yml",
    "on: [push, pull_request]\njobs:\n  t:\n    steps:\n      - run: just check\n",
    "[push, pull_request]",
    "[]",
  ],
  [
    "ci branches",
    "/w/.github/workflows/ci.yml",
    "on:\n  push:\n    branches: [main]\njobs:\n  t:\n    steps:\n      - run: just check\n",
    "branches: [main]",
    "branches: [nonexist]",
  ],
  [
    "ci run exit0",
    "/w/.github/workflows/ci.yml",
    "jobs:\n  t:\n    steps:\n      - run: just check\n",
    "just check",
    "just check; exit 0",
  ],
  [
    "ci run true",
    "/w/.github/workflows/ci.yml",
    "jobs:\n  t:\n    steps:\n      - run: just check\n",
    "just check",
    "true",
  ],
  [
    "ci run :",
    "/w/.github/workflows/ci.yml",
    "jobs:\n  t:\n    steps:\n      - run: just check\n",
    "just check",
    ":",
  ],
  [
    "ci run ignore-errors",
    "/w/.github/workflows/ci.yml",
    "jobs:\n  t:\n    steps:\n      - run: just check\n",
    "just check",
    "just check\n        shell: bash {0}",
  ],
  [
    "ci timeout",
    "/w/.github/workflows/ci.yml",
    "jobs:\n  t:\n    steps:\n      - run: just check\n",
    "    steps:",
    "    timeout-minutes: 0\n    steps:",
  ],
  [
    "ci runs-on",
    "/w/.github/workflows/ci.yml",
    "jobs:\n  t:\n    runs-on: ubuntu\n    steps:\n      - run: just check\n",
    "runs-on: ubuntu",
    "runs-on: [nonexistent]",
  ],
  [
    "ci if never",
    "/w/.github/workflows/ci.yml",
    "jobs:\n  t:\n    steps:\n      - run: just check\n",
    "    steps:",
    "    if: github.event_name == 'never'\n    steps:",
  ],
  [
    "ci if 0",
    "/w/.github/workflows/ci.yml",
    "jobs:\n  t:\n    steps:\n      - run: just check\n",
    "    steps:",
    "    if: ${{ 1 == 2 }}\n    steps:",
  ],
  [
    "ci step if false",
    CI,
    BASE,
    "      - run: just check\n",
    "      - run: just check\n        if: false\n",
  ],
  [
    "ci step if false2",
    CI,
    BASE,
    "      - run: just check",
    "      - name: x\n        if: false\n        run: just check",
  ],
  [
    "ci job if false",
    CI,
    BASE,
    "    runs-on: ubuntu\n",
    "    runs-on: ubuntu\n    if: false\n",
  ],
  [
    "ci if ${{false}}",
    CI,
    BASE,
    "    runs-on: ubuntu\n",
    "    runs-on: ubuntu\n    if: ${{ false }}\n",
  ],
  [
    "ci if 'false'",
    CI,
    BASE,
    "    runs-on: ubuntu\n",
    "    runs-on: ubuntu\n    if: 'false'\n",
  ],
  [
    "ci if 1==0",
    CI,
    BASE,
    "    runs-on: ubuntu\n",
    "    runs-on: ubuntu\n    if: 1 == 0\n",
  ],
  [
    "step shell",
    "/w/.github/workflows/ci.yml",
    BASE,
    "      - run: just check\n",
    "      - run: just check\n        shell: bash {0}\n",
  ],
  [
    "job timeout 0",
    "/w/.github/workflows/ci.yml",
    BASE,
    "    runs-on: ubuntu\n",
    "    runs-on: ubuntu\n    timeout-minutes: 0\n",
  ],
  [
    "step timeout 0",
    "/w/.github/workflows/ci.yml",
    BASE,
    "      - run: just check\n",
    "      - run: just check\n        timeout-minutes: 0\n",
  ],
  [
    "new step with if",
    "/w/.github/workflows/ci.yml",
    BASE,
    "      - run: just check\n",
    "      - run: just check\n      - if: false\n        run: just lint\n",
  ],
  [
    "new step with if in a list",
    "/w/.github/workflows/ci.yml",
    BASE,
    "      - run: just check\n",
    "      - run: just check\n      - name: x\n        if: ${{ false }}\n        run: just lint\n",
  ],
  [
    "new step with continue-on-error",
    "/w/.github/workflows/ci.yml",
    BASE,
    "      - run: just check\n",
    "      - run: just check\n      - run: just lint\n        continue-on-error: true\n",
  ],
  [
    "new step with ||",
    "/w/.github/workflows/ci.yml",
    BASE,
    "      - run: just check\n",
    "      - run: just check\n      - run: just lint || true\n",
  ],
  [
    "new step with ; true",
    "/w/.github/workflows/ci.yml",
    BASE,
    "      - run: just check\n",
    "      - run: just check\n      - run: just lint; true\n",
  ],
  [
    "new step with exit 0",
    "/w/.github/workflows/ci.yml",
    BASE,
    "      - run: just check\n",
    "      - run: just check\n      - run: |\n          just lint\n          exit 0\n",
  ],
  [
    "new job with if",
    "/w/.github/workflows/ci.yml",
    BASE,
    "    steps:\n      - uses",
    "    if: false\n    steps:\n      - uses",
  ],
  [
    "new key in an old step",
    "/w/.github/workflows/ci.yml",
    BASE,
    "      - run: just check\n",
    "      - run: just check\n        env:\n          SKIP: 1\n",
  ],
  [
    "new trigger branch",
    "/w/.github/workflows/ci.yml",
    "on:\n  push:\n    branches: [main]\n" + BASE,
    "[main]",
    "[main, x]",
  ],
  [
    "gitlab script ||",
    "/w/.gitlab-ci.yml",
    "test:\n  script:\n    - just check\n",
    "    - just check\n",
    "    - just check\n    - just lint || true\n",
  ],
];

for (const [title, file, text, old, now] of ASKS)
  test(`the review payload \`${title}\` gets an ask`, async () => {
    expect(await editAsks(file, text, old, now)).toBe(true);
  });

const SAFE: Case[] = [
  [
    "new step",
    "/w/.github/workflows/ci.yml",
    BASE,
    "      - run: just check\n",
    "      - run: just check\n      - run: just lint\n",
  ],
  [
    "new named step",
    "/w/.github/workflows/ci.yml",
    BASE,
    "      - run: just check\n",
    "      - run: just check\n      - name: Lint\n        run: just lint\n        env:\n          CI: 1\n",
  ],
  [
    "new step with a block run",
    "/w/.github/workflows/ci.yml",
    BASE,
    "      - run: just check\n",
    "      - run: just check\n      - run: |\n          just lint\n          just test\n",
  ],
  [
    "new job",
    "/w/.github/workflows/ci.yml",
    BASE,
    "      - run: just check\n",
    "      - run: just check\n  u:\n    runs-on: ubuntu\n    steps:\n      - run: just lint\n",
  ],
  [
    "name change",
    "/w/.github/workflows/ci.yml",
    "name: A\n" + BASE,
    "name: A",
    "name: B",
  ],
  [
    "name added to a step",
    "/w/.github/workflows/ci.yml",
    BASE,
    "      - run: just check\n",
    "      - name: Check\n        run: just check\n",
  ],
  [
    "comment",
    "/w/.github/workflows/ci.yml",
    BASE,
    "      - run: just check\n",
    "      # check\n      - run: just check\n",
  ],
  [
    "moved step",
    "/w/.github/workflows/ci.yml",
    BASE,
    "      - uses: actions/checkout@v4\n      - run: just check\n",
    "      - run: just check\n      - uses: actions/checkout@v4\n",
  ],
];

for (const [title, file, text, old, now] of SAFE)
  test(`the safe change \`${title}\` gets no ask`, async () => {
    expect(await editAsks(file, text, old, now)).toBe(false);
  });

test("a `Write` that drops a step from a CI file gets an ask", async () => {
  expect(
    await writeAsks(CI, BASE, BASE.replace("      - run: just check\n", "")),
  ).toBe(true);
});
