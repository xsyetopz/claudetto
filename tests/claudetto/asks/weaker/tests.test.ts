// The ask on a weaker test file (package P36): a call asks when a test, an assert, or an `expect` is removed or changed.
// A call that renames a test, changes the format, or moves a test gets no ask.
// A call that adds lines goes to the test judge. These tests give the judge only where they name it, so the other calls make no model call.
// Files are strings and no file is read.

import { expect, test } from "bun:test";
import { asks, editAsks, editJudged, write, writeAsks } from "../calls.ts";

const FILE = "/w/tests/a.test.mjs";
const SRC = `import { f, g } from "../src/a.mjs";

test("a", () => {
  expect(f()).toBe(1);
  expect(f(2)).toBe(2);
});

test("b", () => {
  expect(g()).toEqual({ x: 1, y: [1, 2] });
});
`;

test("a removed `expect` gets an ask", async () => {
  expect(await editAsks(FILE, SRC, "  expect(f(2)).toBe(2);\n", "")).toBe(true);
});

test("a changed expected value gets an ask", async () => {
  expect(await editAsks(FILE, SRC, "toBe(1)", "toBe(3)")).toBe(true);
  expect(await editAsks(FILE, SRC, "y: [1, 2]", "y: [1]")).toBe(true);
});

test("a removed test gets an ask", async () => {
  const old =
    'test("b", () => {\n  expect(g()).toEqual({ x: 1, y: [1, 2] });\n});\n';
  expect(await editAsks(FILE, SRC, old, "")).toBe(true);
});

test("a `Write` with fewer asserts gets an ask", async () => {
  expect(await writeAsks(FILE, SRC, 'test("a", () => {});\n')).toBe(true);
});

test("a `MultiEdit` that removes an assert gets an ask", async () => {
  const call = {
    tool_name: "MultiEdit",
    cwd: "/w",
    tool_input: {
      file_path: FILE,
      edits: [{ old_string: "  expect(f(2)).toBe(2);\n", new_string: "" }],
    },
  };
  expect(await asks(call, { [FILE]: SRC })).toBe(true);
});

test("a removed `assert` of a Python test gets an ask", async () => {
  const py = "/w/tests/test_a.py";
  const text = "def test_a():\n    assert f() == 1\n    assert g() == 2\n";
  expect(await editAsks(py, text, "    assert g() == 2\n", "")).toBe(true);
  expect(await editAsks(py, text, "== 2", "== 3")).toBe(true);
});

test("an added test gets no ask", async () => {
  const add = 'test("c", () => {\n  expect(h()).toBe(3);\n});\n';
  expect(await editAsks(FILE, SRC, '\ntest("b"', `\n${add}\ntest("b"`)).toBe(
    false,
  );
  expect(await writeAsks(FILE, SRC, `${SRC}\n${add}`)).toBe(false);
});

test("a test added above an old test gets no ask, also with a body that is not an assert start", async () => {
  const node = `test("a", () => {
  const parts = f(1);
  assert.equal(parts, 1);
});
`;
  const old = 'test("a", () => {';
  const add = 'test("c", () => {\n  assert.deepEqual(f(2), [2]);\n});\n\n';
  expect(await editAsks(FILE, node, old, `${add}${old}`)).toBe(false);
  expect(await writeAsks(FILE, node, node.replace(old, `${add}${old}`))).toBe(
    false,
  );
});

test("an added `assert` method call in an old test gets no ask", async () => {
  const node = 'test("a", () => {\n  assert.equal(f(1), 1);\n});\n';
  const one = "  assert.equal(f(1), 1);\n";
  for (const line of [
    "  assert.equal(f(2), 2);\n",
    "  assert.deepEqual(g(), [1]);\n",
    "  assert.strict.equal(f(3), 3);\n",
    "  t.assert.ok(f(4));\n",
  ])
    expect(await editAsks(FILE, node, one, `${one}${line}`)).toBe(false);
});

test("an added `assert` method call with an assignment goes to the test judge", async () => {
  const node = 'test("a", () => {\n  assert.equal(f(1), 1);\n});\n';
  const one = "  assert.equal(f(1), 1);\n";
  const line = "  assert.equal = () => {};\n";
  expect(await editJudged(FILE, node, one, `${one}${line}`, line)).toBe(true);
});

test("an added assert outside each test block goes to the test judge", async () => {
  const node = 'test("a", () => {\n  assert.equal(f(1), 1);\n});\n';
  for (const line of ["expect(f(2)).toBe(2);\n", "assert.equal(f(2), 2);\n"])
    expect(await editJudged(FILE, node, node, `${node}${line}`, line)).toBe(
      true,
    );
});

test("a test added above an old test that changes the old test gets an ask", async () => {
  const add = 'test("c", () => {\n  expect(h()).toBe(3);\n});\n\n';
  const now = SRC.replace('test("a"', `${add}test("a"`).replace(
    "toBe(1)",
    "toBe(3)",
  );
  expect(await writeAsks(FILE, SRC, now)).toBe(true);
});

test("a renamed test gets no ask", async () => {
  expect(await editAsks(FILE, SRC, 'test("a"', 'test("a returns one"')).toBe(
    false,
  );
});

test("a format change of an assert gets no ask", async () => {
  const wide = "  expect(g()).toEqual({\n    x: 1,\n    y: [1, 2],\n  });\n";
  expect(
    await editAsks(
      FILE,
      SRC,
      "  expect(g()).toEqual({ x: 1, y: [1, 2] });\n",
      wide,
    ),
  ).toBe(false);
  expect(
    await editAsks(FILE, SRC, "expect(f()).toBe(1)", "expect( f() ).toBe( 1 )"),
  ).toBe(false);
});

test("a moved test gets no ask", async () => {
  const a =
    'test("a", () => {\n  expect(f()).toBe(1);\n  expect(f(2)).toBe(2);\n});\n';
  const b =
    'test("b", () => {\n  expect(g()).toEqual({ x: 1, y: [1, 2] });\n});\n';
  const head = 'import { f, g } from "../src/a.mjs";\n\n';
  expect(await writeAsks(FILE, `${head}${a}\n${b}`, `${head}${b}\n${a}`)).toBe(
    false,
  );
});

test("a change of a helper line of a test file gets an ask", async () => {
  expect(await editAsks(FILE, SRC, "../src/a.mjs", "../src/b.mjs")).toBe(true);
});

test("a new test file and a new assert in an old test get no ask", async () => {
  expect(await asks(write("/w/tests/new.test.mjs", SRC))).toBe(false);
  expect(
    await editAsks(
      FILE,
      SRC,
      "  expect(f(2)).toBe(2);\n",
      "  expect(f(2)).toBe(2);\n  expect(f(3)).toBe(3);\n",
    ),
  ).toBe(false);
});

for (const file of [
  "/w/src/a.mjs",
  "/w/src/contest.mjs",
  "/w/src/latest/a.mjs",
  "/w/docs/tests.md",
]) {
  test(`an \`Edit\` of the file \`${file}\` that removes an assert gets no ask`, async () => {
    expect(
      await editAsks(file, "expect(a).toBe(1);\n", "expect(a).toBe(1);\n", ""),
    ).toBe(false);
  });
}
