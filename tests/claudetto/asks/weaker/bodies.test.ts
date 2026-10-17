// Review payloads for the ask on a weaker test file (package P36).
// A call asks when it changes or removes a line of a test file.
// A call that adds lines goes to the test judge, which a stub answers here, so no model call goes out.
// Files are strings and no file is read.

import { expect, test } from "bun:test";
import { editAsks, editJudged, writeAsks, writeJudged } from "../calls.ts";

const T = "/w/src/a.test.ts";
const TS = `import {test,expect} from "bun:test";
test("a", () => {
  expect(x).toBe(1);
  expect(y).toBe(3);
});
test("b", () => {
  expect(z).toBe(2);
});
`;
const QT = "/w/a.test.ts";
const QS = 'test("a", () => {\n  expect(x).toBe(1);\n});\n';

/** `[title, file, text, old, new]` for an `Edit` that must get an ask. */
type Case = [string, string, string, string, string];

const ASKS: Case[] = [
  [
    "del test block",
    T,
    TS,
    `test("b", () => {\n  expect(z).toBe(2);\n});\n`,
    "",
  ],
  ["toBeDefined", T, TS, "toBe(3)", "toBeDefined()"],
  [
    "if false",
    T,
    TS,
    `  expect(z).toBe(2);`,
    `  if (false) { expect(z).toBe(2); }`,
  ],
  ["true tobe true", T, TS, "expect(x).toBe(1)", "expect(true).toBe(true)"],
  ["toBeTruthy", T, TS, "expect(y).toBe(3)", "expect(y).toBeTruthy()"],
  ["commented out", T, TS, "  expect(y).toBe(3);", "  // expect(y).toBe(3);"],
  [
    "return early",
    T,
    TS,
    "  expect(y).toBe(3);",
    "  return; expect(y).toBe(3);",
  ],
  ["x.skip", T, TS, 'test("b"', 'test.skip("b"'],
  [
    "x.todo",
    T,
    TS,
    'test("b", () => {\n  expect(z).toBe(2);\n});',
    'test.todo("b");',
  ],
  [
    "py assert true",
    "/w/t/test_a.py",
    "def test_a():\n    assert x == 1\n",
    "assert x == 1",
    "assert True",
  ],
  [
    "py assert 1",
    "/w/t/test_a.py",
    "def test_a():\n    assert x == 1\n",
    "assert x == 1",
    "assert 1",
  ],
  [
    "py pass",
    "/w/t/test_a.py",
    "def test_a():\n    assert x == 1\n",
    "assert x == 1",
    "pass",
  ],
  [
    "xfail",
    "/w/t/test_a.py",
    "def test_a():\n    assert x == 1\n",
    "def test_a",
    "@pytest.mark.xfail\ndef test_a",
  ],
  [
    "rust ignore",
    "/w/src/a_test.rs",
    "#[test]\nfn a(){ assert_eq!(1,1); }\n",
    "#[test]",
    "#[test]\n#[ignore]",
  ],
  [
    "go skip",
    "/w/a_test.go",
    "func TestA(t *testing.T){\n\tif x!=1 { t.Fatal() }\n}\n",
    "\tif x!=1 { t.Fatal() }",
    "\tt.Skip()",
  ],
  [
    "go fatal->log",
    "/w/a_test.go",
    "func TestA(t *testing.T){\n\tif x!=1 { t.Fatal() }\n}\n",
    "t.Fatal()",
    "t.Log()",
  ],
  [
    "expect cond",
    QT,
    QS,
    "  expect(x).toBe(1);",
    "  if (process.env.CI) expect(x).toBe(1);",
  ],
  [
    "try catch",
    QT,
    QS,
    "  expect(x).toBe(1);",
    "  try { expect(x).toBe(1); } catch {}",
  ],
  ["expect.soft", QT, QS, "expect(x).toBe(1)", "expect(x).toBe(1) || 1"],
  ["tobe tonot", QT, QS, "expect(x).toBe(1)", "expect(x).not.toBe(99)"],
  [
    "catch swallow",
    QT,
    QS,
    "  expect(x).toBe(1);",
    "  await expect(x).resolves.toBe(1).catch(()=>{})",
  ],
  ["timeout", QT, QS, "});\n", "}, 0);\n"],
  ["expect(1)", QT, QS, "expect(x).toBe(1)", "expect(1).toBe(1)"],
  ["toBe(x)", QT, QS, "expect(x).toBe(1)", "expect(x).toBe(x)"],
  [
    "py if False",
    "/w/test_a.py",
    "def test_a():\n    assert x == 1\n",
    "    assert x == 1",
    "    if False:\n        assert x == 1",
  ],
  [
    "py skip",
    "/w/test_a.py",
    "def test_a():\n    assert x == 1\n",
    "def test_a",
    "@unittest.skip('x')\ndef test_a",
  ],
  [
    "py assert or true",
    "/w/test_a.py",
    "def test_a():\n    assert x == 1\n",
    "assert x == 1",
    "assert x == 1 or True",
  ],
  [
    "py rename",
    "/w/test_a.py",
    "def test_a():\n    assert x == 1\n",
    "def test_a",
    "def helper_a",
  ],
  ["ts rename", "/w/a.test.ts", TS, 'test("a"', 'function helper("a"'],
  ["ts xtest", QT, QS, 'test("a"', 'xit("a"'],
  ["ts rename helper", QT, QS, 'test("a", () => {', "const a = () => {"],
  [
    "go rename",
    "/w/a_test.go",
    "func TestA(t *testing.T){\n\tif x!=1 { t.Fatal() }\n}\n",
    "func TestA",
    "func testA",
  ],
];

for (const [title, file, text, old, now] of ASKS)
  test(`the review payload \`${title}\` gets an ask`, async () => {
    expect(await editAsks(file, text, old, now)).toBe(true);
  });

/** `[title, file, text, old, new]` for an `Edit` that only adds lines, so it goes to the test judge. */
const JUDGED: Case[] = [
  [
    "if false",
    QT,
    QS,
    "  expect(x).toBe(1);",
    "  if (false) {\n    expect(x).toBe(1);\n  }",
  ],
  [
    "return early",
    QT,
    QS,
    "  expect(x).toBe(1);",
    "  return;\n  expect(x).toBe(1);",
  ],
  [
    "py return",
    "/w/test_a.py",
    "def test_a():\n    assert x == 1\n",
    "    assert x == 1",
    "    return\n    assert x == 1",
  ],
  [
    "rust cfg",
    "/w/tests/a.rs",
    "#[test]\nfn a(){ assert_eq!(1,1); }\n",
    "#[test]",
    "#[test]\n#[cfg(any())]",
  ],
];

for (const [title, file, text, old, now] of JUDGED)
  test(`the review payload \`${title}\` goes to the test judge`, async () => {
    expect(await editJudged(file, text, old, now)).toBe(true);
  });

test("a `Write` with fewer asserts gets an ask", async () => {
  expect(
    await writeAsks(
      T,
      TS,
      'import {test} from "bun:test";\ntest("a",()=>{});\n',
    ),
  ).toBe(true);
});

const NEW = 'test("c", () => {\n  expect(h()).toBe(3);\n});\n';

/** `[title, added text]` for an `Edit` that adds the text before the test `b`, so it goes to the test judge. */
const ADDED: [string, string][] = [
  [
    "a new test with `if`",
    'test("c", () => {\n  if (h()) expect(h()).toBe(3);\n});\n',
  ],
  [
    "a new test with `return`",
    'test("c", () => {\n  return;\n  expect(h()).toBe(3);\n});\n',
  ],
  [
    "a new test with `&&`",
    'test("c", () => {\n  h() && expect(h()).toBe(3);\n});\n',
  ],
  [
    "a new test with a ternary",
    'test("c", () => {\n  h() ? expect(h()).toBe(3) : 0;\n});\n',
  ],
  [
    "a new test with `try`",
    'test("c", () => {\n  try {\n    expect(h()).toBe(3);\n  } catch (e) {}\n});\n',
  ],
  [
    "a new test with a timeout",
    'test("c", () => {\n  expect(h()).toBe(3);\n}, 0);\n',
  ],
  [
    "a new test with `only`",
    'test.only("c", () => {\n  expect(h()).toBe(3);\n});\n',
  ],
  [
    "a new test with `skip`",
    'test.skip("c", () => {\n  expect(h()).toBe(3);\n});\n',
  ],
  ["a new `todo`", 'test.todo("c");\n'],
  [
    "a new loop",
    'for (const v of []) {\n  test("c", () => {\n    expect(v).toBe(3);\n  });\n}\n',
  ],
  ["a new `process.exit`", "process.exit(0);\n"],
];

for (const [title, added] of ADDED)
  test(`${title} goes to the test judge`, async () => {
    expect(
      await editJudged(T, TS, '\ntest("b"', `\n${added}\ntest("b"`, added),
    ).toBe(true);
  });

const PY = "/w/tests/test_a.py";
const PYS = "def test_a():\n    assert x == 1\n";

for (const added of [
  "\ndef test_b():\n    if y:\n        assert y == 2\n",
  "\ndef test_b():\n    return\n    assert y == 2\n",
  "\ndef test_b():\n    assert y == 2 or True\n",
  "\n@pytest.mark.skip\ndef test_b():\n    assert y == 2\n",
  "\ndef test_b():\n    pytest.skip('x')\n    assert y == 2\n",
])
  test(`a new Python test with control flow goes to the test judge: ${JSON.stringify(added)}`, async () => {
    expect(await writeJudged(PY, PYS, PYS + added, added)).toBe(true);
  });

test("a `cfg` attribute on an added Rust test goes to the test judge", async () => {
  const rs = "/w/tests/a.rs";
  const text = "#[test]\nfn a() { assert_eq!(1, 1); }\n";
  const more = "#[cfg(any())]\n#[test]\nfn b() { assert_eq!(2, 2); }\n";
  expect(await writeJudged(rs, text, `${text}${more}`, more)).toBe(true);
});

test("an added test and an added assert get no ask", async () => {
  expect(await editAsks(T, TS, '\ntest("b"', `\n${NEW}\ntest("b"`)).toBe(false);
  expect(
    await editAsks(
      T,
      TS,
      "  expect(z).toBe(2);\n",
      "  expect(z).toBe(2);\n  expect(z).not.toBeNull();\n",
    ),
  ).toBe(false);
  expect(
    await writeAsks(PY, PYS, `${PYS}\ndef test_b():\n    assert y == 2\n`),
  ).toBe(false);
});

test("a title with a control word gets no ask", async () => {
  const title =
    'test("returns `null` if the input is empty or skipped", () => {\n  expect(h()).toBe(null);\n});\n';
  expect(await editAsks(T, TS, '\ntest("b"', `\n${title}\ntest("b"`)).toBe(
    false,
  );
});

test("a new comment and a format change get no ask", async () => {
  expect(await editAsks(T, TS, 'test("a"', '// note\ntest("a"')).toBe(false);
  expect(
    await editAsks(T, TS, "expect(y).toBe(3)", "expect(  y  ).toBe( 3 )"),
  ).toBe(false);
});

test("a rename of a test title gets no ask", async () => {
  expect(await editAsks(T, TS, 'test("b"', 'test("b is two"')).toBe(false);
  expect(await editAsks(PY, PYS, "def test_a", "def test_first")).toBe(false);
});
