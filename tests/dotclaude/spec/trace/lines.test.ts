// The domain rules of the trace: the citations, the trivial lines, the diff parser, the skipped paths, and the findings.

import { describe, expect, test } from "bun:test";
import {
  addedLines,
  citedIds,
  countOf,
  isSourcePath,
  isTrivial,
  traceLines,
} from "../../../../src/plugins/dotclaude/slices/spec/domain/trace.ts";

const at = (...texts: string[]) =>
  texts.map((text, i) => ({ file: "a.ts", line: i + 1, text }));

describe("citedIds", () => {
  test("reads one ID, a list, and two citations", () => {
    expect(citedIds("x(); // [REQ-12]")).toEqual([12]);
    expect(citedIds("# [REQ-12, REQ-14]")).toEqual([12, 14]);
    expect(citedIds("// [REQ-1] and [REQ-2]")).toEqual([1, 2]);
  });

  test("reads a citation in a comment, also a block comment before code", () => {
    expect(citedIds(" * see [REQ-3]")).toEqual([3]);
    expect(citedIds("/* [REQ-3] */ run();")).toEqual([3]);
    expect(citedIds("<!-- [REQ-4] -->")).toEqual([4]);
  });

  test.each([
    'const s = "[REQ-1]";',
    "const s = '// [REQ-1]';",
    "run(`[REQ-1]`);",
    "[REQ-1]",
    'x = "a" + "[REQ-1]";',
  ])("does not read a citation in code: %s", (text) =>
    expect(citedIds(text)).toEqual([]),
  );

  test.each(["REQ-1", "[REQ-01]", "[REQ-]", "[req-1]", "[REQ-1 REQ-2]"])(
    "does not read %s",
    (text) => expect(citedIds(text)).toEqual([]),
  );
});

describe("isTrivial", () => {
  test.each([
    "",
    "   ",
    "}",
    "  });",
    "],",
    ") =>",
    "// a comment",
    "  # a comment",
    "#!/bin/sh",
    "/* start",
    " * middle",
    " */",
    "*",
    "<!-- html -->",
    "-- sql",
    'import { a } from "b";',
    "import x",
    'import "side-effect";',
    "import type { A } from './a.ts'",
    'export { a } from "./a.ts";',
    "export * from './a.ts'",
    "export type { T };",
    'export { default } from "./a.ts"',
    "from os import path",
    "#include <stdio.h>",
    "/* a */",
    "/* a */ }",
    "} // end",
    "*/ }",
    'import { a } from "b"; // [REQ-1]',
  ])("%j is trivial", (text) => expect(isTrivial(text)).toBe(true));

  test.each([
    "const a = 1;",
    "return x;",
    "foo();",
    "*p = 1;",
    "--i;",
    "#priv = 1;",
    'import("x").then(run);',
    "export const f = (a) => a;",
    "export default a;",
    "if (a) {",
    "x = 1 // trailing comment",
    "/* a */ run();",
    "*/ run();",
    "<!-- x --> <div/>",
    "* b;",
    "import x from 'y'; run();",
    "export const a = \"x from 'y'\";",
    'import { a } from "b"; run();',
    "export { a }; run();",
    "from os import path; run()",
  ])("%j is not trivial", (text) => expect(isTrivial(text)).toBe(false));
});

describe("addedLines", () => {
  const diff = [
    "diff --git a/src/a.ts b/src/a.ts",
    "index 1..2 100644",
    "--- a/src/a.ts",
    "+++ b/src/a.ts",
    "@@ -3,0 +4,2 @@ context",
    "+one",
    "+++two",
    "@@ -9 +11 @@",
    "-old",
    "+new",
    "\\ No newline at end of file",
    "diff --git a/gone.ts b/gone.ts",
    "--- a/gone.ts",
    "+++ /dev/null",
    "@@ -1 +0,0 @@",
    "-x",
    "diff --git a/b.ts b/b.ts",
    "--- /dev/null",
    "+++ b/b.ts",
    "@@ -0,0 +1 @@",
    "+first",
    "",
  ].join("\n");

  test("gives the file and the new line number of each added line", () => {
    expect(addedLines(diff)).toEqual([
      { file: "src/a.ts", line: 4, text: "one" },
      { file: "src/a.ts", line: 5, text: "++two" },
      { file: "src/a.ts", line: 11, text: "new" },
      { file: "b.ts", line: 1, text: "first" },
    ]);
  });

  test("reads a quoted file name with an escape", () => {
    const quoted = [
      'diff --git "a/a\\tb.ts" "b/a\\tb.ts"',
      "--- /dev/null",
      '+++ "b/a\\tb.ts"',
      "@@ -0,0 +1 @@",
      "+x",
      'diff --git "a/q\\"r.ts" "b/q\\"r.ts"',
      "--- /dev/null",
      '+++ "b/q\\"r.ts"',
      "@@ -0,0 +1 @@",
      "+y",
      "",
    ].join("\n");
    expect(addedLines(quoted)).toEqual([
      { file: "a\tb.ts", line: 1, text: "x" },
      { file: 'q"r.ts', line: 1, text: "y" },
    ]);
  });

  test("gives nothing for an empty diff", () => {
    expect(addedLines("")).toEqual([]);
  });
});

describe("isSourcePath", () => {
  test.each([
    "a.ts",
    "x/a.tsx",
    "a.mjs",
    "a.py",
    "a.rs",
    "a.go",
    "a.sh",
    "lock.ts",
    "src/json.ts",
    "A.TS",
    "a.test.js",
  ])("reads %s", (file) => expect(isSourcePath(file)).toBe(true));

  test.each([
    "README.md",
    "package.json",
    "bun.lock",
    "Cargo.lock",
    "go.sum",
    "pnpm-lock.yaml",
    "notes.txt",
    "a.yml",
    "image.png",
    "Makefile",
    "unlock",
    ".ts",
  ])("skips %s", (file) => expect(isSourcePath(file)).toBe(false));
});

describe("traceLines", () => {
  const known = new Set([1, 2]);

  test("a clean diff has no finding", () => {
    expect(
      traceLines(at("", "// note", "}", "const a = 1; // [REQ-1]"), known),
    ).toEqual([]);
  });

  test("a non-trivial line with no citation is uncited", () => {
    expect(traceLines(at("const a = 1;"), known)).toEqual([
      { kind: "uncited", file: "a.ts", line: 1, text: "const a = 1;" },
    ]);
  });

  test("a cited ID that no requirement has is an orphan, also in a comment line", () => {
    const found = traceLines(
      at("// [REQ-9]", "run(); // [REQ-1, REQ-8]"),
      known,
    );
    expect(found.map((f) => [f.kind, f.line, f.id])).toEqual([
      ["orphan", 1, 9],
      ["orphan", 2, 8],
    ]);
  });

  test("a citation in a string is no citation, and an ID in a string is no orphan", () => {
    const found = traceLines(
      at('s = "[REQ-1]";', 's = "[REQ-9]"; // [REQ-1]'),
      known,
    );
    expect(found.map((f) => [f.kind, f.line])).toEqual([["uncited", 1]]);
  });

  test("code after a leading comment needs a citation", () => {
    expect(
      traceLines(at("/* a */ run();", "*/ run();"), known).map((f) => f.line),
    ).toEqual([1, 2]);
  });

  test("the closing line of an import list that has code after it is uncited", () => {
    expect(
      traceLines(at("import {", "  a,", '} from "x"; run();'), known).map(
        (f) => f.line,
      ),
    ).toEqual([3]);
  });

  test("the lines inside an import list that spans lines are trivial", () => {
    expect(
      traceLines(
        at("import {", "  a,", "  b,", '} from "x";', "run();"),
        known,
      ).map((f) => f.line),
    ).toEqual([5]);
  });

  test("an export of a function that opens a brace is not an import list", () => {
    expect(
      traceLines(at("export const f = ({", "  a,", "}) => a;"), known).map(
        (f) => f.line,
      ),
    ).toEqual([1, 2, 3]);
  });

  test("an import list does not carry over a gap in the lines", () => {
    const lines = [
      { file: "a.ts", line: 1, text: "import {" },
      { file: "a.ts", line: 9, text: "run();" },
      { file: "b.ts", line: 10, text: "run();" },
    ];
    expect(traceLines(lines, known).map((f) => f.file)).toEqual([
      "a.ts",
      "b.ts",
    ]);
  });

  test("countOf counts each kind", () => {
    const found = traceLines(at("// [REQ-9]", "run();", "go();"), known);
    expect(countOf(found)).toEqual({ orphans: 1, uncited: 2 });
  });
});
