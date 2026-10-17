// The ask on a weaker test file (package P54): an edit that only adds names to an import gets no ask.
// A removed name, a renamed name, a changed module, a changed default or namespace import, and a mock still get an ask.
// Files are strings and no file is read.

import { expect, test } from "bun:test";
import { editAsks, editJudged } from "../calls.ts";

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
  test(`an import edit that adds ${name} goes to the test judge`, async () => {
    const py = file.endsWith(".py");
    const was = py ? "from m import a" : 'import { add } from "./math.ts";';
    const now = py
      ? `from m import a, b\n${line}`
      : `${was.replace("add", "add, mul")}\n${line}`;
    const text = was + (py ? PY_BODY : BODY);
    expect(await editJudged(file, text, was, now, line)).toBe(true);
  });

test("an edit that adds a name and a changed assert gets an ask", async () => {
  const was = 'import { add } from "./math.ts";';
  const text = was + BODY;
  const now = `${was.replace("add", "add, mul")}${BODY.replace("toBe(3)", "toBe(4)")}`;
  expect(await editAsks(TS, text, text, now)).toBe(true);
});

const HIDING: [string, string, string, string][] = [
  [
    "a Python statement after the name",
    PY,
    "from m import a",
    "from m import a, b; expect = id",
  ],
  [
    "a Python `pytest` reset after the name",
    PY,
    "from m import a",
    "from m import a, b; pytest = None",
  ],
  [
    "a Python `raise` after the name",
    PY,
    "from m import a",
    "from m import a, b; raise SystemExit",
  ],
  [
    "a `require` default with `jest.mock`",
    "/w/tests/a.test.js",
    'const { a } = require("x");',
    'const { a, b = jest.mock("m") } = require("x");',
  ],
  [
    "a `require` default with `process.exit`",
    "/w/tests/a.test.js",
    'const { a } = require("x");',
    'const { a, b = process.exit(0) } = require("x");',
  ],
  [
    "a default alias of `expect`",
    TS,
    'import { a } from "x";',
    'import { a, default as expect } from "x";',
  ],
  [
    "a `type` name",
    TS,
    'import { a } from "x";',
    'import { a, type expect } from "x";',
  ],
  [
    "a `require` alias of `expect`",
    "/w/tests/a.test.js",
    'const { a } = require("x");',
    'const { a, b: expect } = require("x");',
  ],
  [
    "an empty old import",
    TS,
    'import {} from "x";',
    'import { expect } from "x";',
  ],
  [
    "an empty old Python-free `require`",
    "/w/tests/a.test.js",
    'const {} = require("x");',
    'const { b } = require("x");',
  ],
];

for (const g of [
  "expect",
  "test",
  "it",
  "describe",
  "assert",
  "beforeEach",
  "afterEach",
  "beforeAll",
  "afterAll",
  "vi",
  "jest",
  "mock",
])
  HIDING.push([
    `an added test global \`${g}\``,
    TS,
    'import { add } from "./math.ts";',
    `import { add, ${g} } from "./math.ts";`,
  ]);
for (const g of ["pytest", "unittest", "TestCase", "skip", "mock", "patch"])
  HIDING.push([
    `an added Python test global \`${g}\``,
    PY,
    "from m import a",
    `from m import a, ${g}`,
  ]);

for (const [name, file, was, now] of HIDING)
  test(`${name} in an import gets an ask`, async () => {
    const body = file.endsWith(".py") ? PY_BODY : BODY;
    expect(await editAsks(file, was + body, was, now)).toBe(true);
  });

test("two equal import lines that both gain a test global get an ask", async () => {
  const was = 'import { a } from "x";';
  const text = `${was}\n${was}${BODY}`;
  const now = 'import { a, expect } from "x";\nimport { a, test } from "x";';
  expect(await editAsks(TS, text, `${was}\n${was}`, now)).toBe(true);
});

test("two equal import lines that both gain a plain name get no ask", async () => {
  const was = 'import { a } from "x";';
  const text = `${was}\n${was}${BODY}`;
  const now = 'import { a, b } from "x";\nimport { a, c } from "x";';
  expect(await editAsks(TS, text, `${was}\n${was}`, now)).toBe(false);
});
