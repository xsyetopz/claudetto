// The ask on a weaker test file (package P54): an edit that only adds names to an import gets no ask.
// A removed name, a renamed name, a changed module, a changed default or namespace import, and a mock still get an ask.
// Files are strings and no file is read.

import { expect, test } from "bun:test";
import { editAsks } from "../calls.ts";

const TS = "/w/tests/a.test.ts";
const PY = "/w/tests/test_a.py";
const BODY = `
test("a", () => {
  expect(add(1, 2)).toBe(3);
});
`;
const PY_BODY = `

def test_a():
    assert add(1, 2) == 3
`;

const SAFE: [string, string, string, string][] = [
  [
    "named import in TypeScript",
    TS,
    'import { add } from "./math.ts";',
    'import { add, mul } from "./math.ts";',
  ],
  [
    "named import over several lines",
    TS,
    'import { a } from "x";',
    'import {\n  a,\n  b,\n} from "x";',
  ],
  [
    "named import that was on several lines",
    TS,
    'import {\n  a,\n  b,\n} from "x";',
    'import {\n  a,\n  b,\n  c,\n} from "x";',
  ],
  [
    "type import",
    TS,
    'import type { A } from "x";',
    'import type { A, B } from "x";',
  ],
  [
    "`require` in JavaScript",
    "/w/tests/a.test.js",
    'const { a } = require("x");',
    'const { a, b } = require("x");',
  ],
  ["Python `from` import", PY, "from m import a", "from m import a, b"],
  [
    "Python import in parentheses",
    PY,
    "from m import (\n    a,\n)",
    "from m import (\n    a,\n    b,\n)",
  ],
];

for (const [name, file, was, now] of SAFE)
  test(`an added name in a ${name} gets no ask`, async () => {
    const body = file.endsWith(".py") ? PY_BODY : BODY;
    expect(await editAsks(file, was + body, was, now)).toBe(false);
  });

const ASKED: [string, string, string, string][] = [
  [
    "a removed name",
    TS,
    'import { add, mul } from "./math.ts";',
    'import { add } from "./math.ts";',
  ],
  [
    "a renamed name",
    TS,
    'import { add } from "./math.ts";',
    'import { sum, mul } from "./math.ts";',
  ],
  [
    "a name with an alias",
    TS,
    'import { add } from "./math.ts";',
    'import { add as plus, mul } from "./math.ts";',
  ],
  [
    "a changed module",
    TS,
    'import { add } from "./math.ts";',
    'import { add, mul } from "./fake.ts";',
  ],
  [
    "a changed default import",
    TS,
    'import add from "./math.ts";',
    'import add, { mul } from "./math.ts";',
  ],
  [
    "a namespace import",
    TS,
    'import { add } from "./math.ts";',
    'import * as add from "./math.ts";',
  ],
  [
    "a changed `require` module",
    "/w/tests/a.test.js",
    'const { a } = require("x");',
    'const { a, b } = require("y");',
  ],
  ["a removed Python name", PY, "from m import a, b", "from m import a"],
  ["a changed Python module", PY, "from m import a", "from n import a, b"],
];

for (const [name, file, was, now] of ASKED)
  test(`${name} in an import gets an ask`, async () => {
    const body = file.endsWith(".py") ? PY_BODY : BODY;
    expect(await editAsks(file, was + body, was, now)).toBe(true);
  });

const MOCKS: [string, string, string][] = [
  ["mock.module", TS, 'mock.module("./math.ts", () => ({}));'],
  ["jest.mock", TS, 'jest.mock("./math.ts");'],
  ["vi.mock", TS, 'vi.mock("./math.ts");'],
  ["unittest.mock.patch", PY, "unittest.mock.patch('m.add')"],
];

for (const [name, file, line] of MOCKS)
  test(`an import edit that adds ${name} gets an ask`, async () => {
    const py = file.endsWith(".py");
    const was = py ? "from m import a" : 'import { add } from "./math.ts";';
    const now = py
      ? `from m import a, b\n${line}`
      : `${was.replace("add", "add, mul")}\n${line}`;
    expect(await editAsks(file, was + (py ? PY_BODY : BODY), was, now)).toBe(
      true,
    );
  });

test("an edit that adds a name and a changed assert gets an ask", async () => {
  const was = 'import { add } from "./math.ts";';
  const text = was + BODY;
  const now = `${was.replace("add", "add, mul")}${BODY.replace("toBe(3)", "toBe(4)")}`;
  expect(await editAsks(TS, text, text, now)).toBe(true);
});
