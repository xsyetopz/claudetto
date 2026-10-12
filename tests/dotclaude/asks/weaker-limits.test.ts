// The ask on a weaker limits file (package P36): a call asks only when a bound changes value or goes away.
// Files are strings and no file is read.

import { expect, test } from "bun:test";
import { editAsks, writeAsks } from "./calls.ts";

const FILE = "/w/plugins/x/limits.ts";
const SRC = `// The bounds.
export const A_MAX = 10;
export const NAMES = [
  "a",
  "b",
];
export const B_MAX = 5;
`;

test("a changed bound gets an ask", async () => {
  expect(await editAsks(FILE, SRC, "A_MAX = 10", "A_MAX = 20")).toBe(true);
  expect(await editAsks(FILE, SRC, '  "b",\n', "")).toBe(true);
  expect(await writeAsks(FILE, SRC, SRC.replace("= 5;", "= 50;"))).toBe(true);
});

test("a removed bound gets an ask", async () => {
  expect(await editAsks(FILE, SRC, "export const B_MAX = 5;\n", "")).toBe(true);
});

test("a changed value in a JSON limits file gets an ask", async () => {
  const json = "/w/limits.json";
  const text = '{\n  "max": 10,\n  "names": ["a"]\n}\n';
  expect(await editAsks(json, text, '"max": 10', '"max": 11')).toBe(true);
  expect(await editAsks(json, text, '"a"', '"a", "b"')).toBe(true);
});

test("a changed value in a Python budget file gets an ask", async () => {
  const py = "/w/pkg/budget.py";
  expect(
    await editAsks(py, "LIMIT = 3\nOTHER = 4\n", "LIMIT = 3", "LIMIT = 9"),
  ).toBe(true);
});

test("an added bound gets no ask", async () => {
  const add = "/** More. */\nexport const C_MAX = 7;\n";
  expect(
    await editAsks(FILE, SRC, "export const B_MAX", `${add}export const B_MAX`),
  ).toBe(false);
  expect(await writeAsks(FILE, SRC, `${SRC}\n${add}`)).toBe(false);
});

test("a changed comment and a format change get no ask", async () => {
  expect(await editAsks(FILE, SRC, "The bounds.", "The limits.")).toBe(false);
  expect(
    await editAsks(FILE, SRC, "A_MAX = 10;", "A_MAX   =   10;  // ten"),
  ).toBe(false);
  expect(await editAsks(FILE, SRC, '  "a",\n  "b",\n', '  "a", "b"\n')).toBe(
    false,
  );
});

test("a moved bound gets no ask", async () => {
  const moved = `// The bounds.
export const B_MAX = 5;
export const A_MAX = 10;
export const NAMES = ["a", "b"];
`;
  expect(await writeAsks(FILE, SRC, moved)).toBe(false);
});

test("an added key in a JSON limits file gets no ask", async () => {
  const json = "/w/limits.json";
  const text = '{\n  "max": 10\n}\n';
  expect(
    await editAsks(json, text, '"max": 10', '"max": 10,\n  "min": 1'),
  ).toBe(false);
});

test("a changed line of a file that is not a limits file gets no ask", async () => {
  expect(
    await editAsks("/w/src/limits-helper.ts", SRC, "A_MAX = 10", "A_MAX = 20"),
  ).toBe(false);
});
