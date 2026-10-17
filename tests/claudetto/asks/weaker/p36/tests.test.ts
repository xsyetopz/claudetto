// Regression tests for the ask on a weaker test file (package P36).
// Each weakening input asks, and each safe input gets no ask.
// Files are strings and no file is read.

import { expect, test } from "bun:test";
import {
  asks,
  editAsks,
  editJudged,
  write,
  writeAsks,
  writeJudged,
} from "../../calls.ts";

const TS = "/w/tests/a.test.ts";
const PY = "/w/tests/test_a.py";
const BASE = `import { expect, test } from "bun:test";
test("a", () => {
  expect(f()).toBe("a b");
});
test("b", () => {
  expect(g()).toBe(2);
});
`;

test("an added skip or early return in a TypeScript test goes to the test judge", async () => {
  expect(
    await writeJudged(
      TS,
      BASE,
      BASE.replace('test("b"', '/* x */ test.skip("b", () => {});\ntest("b"'),
      '/* x */ test.skip("b", () => {});',
    ),
  ).toBe(true);
  expect(
    await editJudged(
      TS,
      BASE,
      '  expect(f()).toBe("a b");',
      '  /* x */ return;\n  expect(f()).toBe("a b");',
      "  /* x */ return;",
    ),
  ).toBe(true);
});

test("an added `expect.assertions(0)` in a test goes to the test judge", async () => {
  expect(
    await editJudged(
      TS,
      BASE,
      'test("a", () => {\n',
      'test("a", () => {\n  expect.assertions(0);\n',
      "  expect.assertions(0);",
    ),
  ).toBe(true);
});

test("an added `mock.module` or a replaced global `expect` goes to the test judge", async () => {
  expect(
    await editJudged(
      TS,
      BASE,
      'import { expect, test } from "bun:test";\n',
      'import { expect, test } from "bun:test";\nmock.module("../src/f.ts", () => ({f: () => 1}));\n',
      'mock.module("../src/f.ts", () => ({f: () => 1}));',
    ),
  ).toBe(true);
  expect(
    await editJudged(
      TS,
      BASE,
      'import { expect, test } from "bun:test";\n',
      'import { expect, test } from "bun:test";\nglobalThis.expect = () => ({});\n',
      "globalThis.expect = () => ({});",
    ),
  ).toBe(true);
});

test("a changed expected value in a test gets an ask", async () => {
  expect(await editAsks(TS, BASE, 'toBe("a b")', 'toBe("ab")')).toBe(true);
});

test("an added `pytest.importorskip` in a Python test goes to the test judge", async () => {
  const text = "def test_a():\n    assert f() == 1\n";
  expect(
    await writeJudged(
      PY,
      text,
      "def test_a():\n    pytest.importorskip('x')\n    assert f() == 1\n",
      "    pytest.importorskip('x')",
    ),
  ).toBe(true);
});

test("an added module-level lambda in a Python test goes to the test judge", async () => {
  const text = "def test_a():\n    assert f() == 1\n";
  expect(
    await writeJudged(PY, text, `f = lambda: 1\n${text}`, "f = lambda: 1"),
  ).toBe(true);
});

test("an added test block with arrange lines gets no ask", async () => {
  expect(
    await writeAsks(
      TS,
      BASE,
      `${BASE}test("c", () => {\n  const x = make(); expect(x).toBe(1);\n});\n`,
    ),
  ).toBe(false);
});

test("a new test file gets no ask", async () => {
  expect(
    await asks(write("/w/tests/new.test.ts", 'test("n", () => {});\n')),
  ).toBe(false);
});
