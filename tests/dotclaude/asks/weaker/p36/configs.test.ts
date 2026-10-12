// Regression tests for the ask on a weaker lint config, runner config, or limits file (package P36).
// Each weakening input asks, and each safe input gets no ask.
// Files are strings and no file is read.

import { expect, test } from "bun:test";
import { editAsks, writeAsks } from "../../calls.ts";

const ESLINT = "/w/eslint.config.js";
const BIOME = "/w/biome.json";
const TSCONFIG = "/w/tsconfig.json";
const PYPROJECT = "/w/pyproject.toml";
const SETUP = "/w/setup.cfg";
const RUFF = "/w/ruff.toml";
const PY_BASE = '[project]\nname = "x"\n';

test("an added weakening section in a Python project config gets an ask", async () => {
  const sections = [
    '[tool."ruff".lint]\nignore=["E"]\n',
    '[tool.bandit]\nskips=["B101"]\n',
    '[tool.basedpyright]\ntypeCheckingMode="off"\n',
  ];
  for (const section of sections)
    expect(await writeAsks(PYPROJECT, PY_BASE, PY_BASE + section)).toBe(true);
});

test("an added skip in a setup.cfg bandit section gets an ask", async () => {
  const text = "[metadata]\nname = x\n";
  expect(await writeAsks(SETUP, text, `${text}[bandit]\nskips = B101\n`)).toBe(
    true,
  );
});

test("a ruff config that selects only `E` gets an ask", async () => {
  expect(
    await writeAsks(
      RUFF,
      "line-length = 88\n",
      'line-length = 88\nselect = ["E"]\n',
    ),
  ).toBe(true);
});

test("a weaker biome rule or a removed negated ignore gets an ask", async () => {
  const biome = '{"linter":{"rules":{"a":"error"}}}';
  expect(
    await writeAsks(
      BIOME,
      biome,
      '{"linter":{"rules":{"a":"off"},"rules.a":"error"}}',
    ),
  ).toBe(true);
  const dist = '{"files":{"ignore":["dist","!dist/keep"]}}';
  expect(await editAsks(BIOME, dist, '["dist","!dist/keep"]', '["dist"]')).toBe(
    true,
  );
});

test("a weaker tsconfig strict flag or an added include gets an ask", async () => {
  const strict = '{"compilerOptions":{"strict":true}}';
  expect(
    await editAsks(
      TSCONFIG,
      strict,
      strict,
      '{"compilerOptions":{"strict":false},"compilerOptions.strict":true}',
    ),
  ).toBe(true);
  expect(
    await editAsks(
      TSCONFIG,
      strict,
      '"strict":true}',
      '"strict":true},"include":["src/a.ts"]',
    ),
  ).toBe(true);
});

test("an added `eslint` rule set to off in a config gets an ask", async () => {
  const text =
    'export default [{\n  rules: {\n    "no-console": "error",\n  },\n}];\n';
  expect(
    await writeAsks(
      ESLINT,
      text,
      text.replace(
        '"no-console": "error",',
        '"no-console": "error",\n    /* c */ "no-debugger": "off",',
      ),
    ),
  ).toBe(true);
});

// This case passed before P36 too, so it is not a regression test of P36.
test("a runner config with a lower coverage threshold gets an ask", async () => {
  const text = "export default { coverage: { lines: 90 } };\n";
  expect(
    await editAsks("/w/vitest.config.ts", text, "lines: 90", "lines: 10"),
  ).toBe(true);
});

test("a changed bound in a limits file gets an ask", async () => {
  expect(
    await editAsks(
      "/w/limits.ts",
      "export default { max: 5 };\n",
      "max: 5",
      "max: 50",
    ),
  ).toBe(true);
  expect(
    await editAsks(
      "/w/limits.js",
      "module.exports = {MAX:5};\n",
      "MAX:5",
      "MAX:50",
    ),
  ).toBe(true);
  expect(
    await editAsks(
      "/w/limits.ts",
      "export class L {\n  static MAX = 5;\n}\n",
      "static MAX = 5",
      "static MAX = 50",
    ),
  ).toBe(true);
  expect(
    await editAsks(
      "/w/limits.go",
      "const (\n\tMax = 5\n)\n",
      "Max = 5",
      "Max = 50",
    ),
  ).toBe(true);
});

test("an increment of a bound in a Python limits file gets an ask", async () => {
  expect(
    await writeAsks("/w/limits.py", "MAX = 5\n", "MAX = 5\nMAX += 100\n"),
  ).toBe(true);
});

test("an added bound in a limits file gets no ask", async () => {
  expect(
    await writeAsks(
      "/w/limits.ts",
      "export const MAX = 5;\n",
      "export const MAX = 5;\nexport const MAX_B = 3;\n",
    ),
  ).toBe(false);
});

test("an added rule that is stricter in a lint config gets no ask", async () => {
  const biome = '{"linter":{"rules":{"a":"error"}}}';
  expect(
    await writeAsks(
      BIOME,
      biome,
      '{"linter":{"rules":{"a":"error","b":"error"}}}',
    ),
  ).toBe(false);
});
