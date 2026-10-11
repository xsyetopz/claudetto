// The pure rules of the `sembr` handlers of the hooks module (spec semantic-line-breaks, design D29):
// the rewrite of `Write` and `Edit`, and the repair of a cross-sentence `old_string`.

import { expect, test } from "bun:test";
import {
  editInput,
  repairEdit,
  rewriteEdit,
  writeInput,
} from "../../../plugins/dotclaude/features/sembr/rules.ts";

const FUSED = "Read the file. Then edit it.";
const SPLIT = "Read the file.\nThen edit it.";
const write = (file_path: string, content: string) => ({
  tool: "Write" as const,
  tool_use_id: "t1",
  file_path,
  content,
});
const edit = (
  file_path: string,
  old_string: string,
  new_string: string,
  extra: { replace_all?: boolean } = {},
) => ({
  tool: "Edit" as const,
  tool_use_id: "t1",
  file_path,
  old_string,
  new_string,
  ...extra,
});

test("a fused write of a `.md` file is split, and the other fields stay", () => {
  const e = write("/w/a.md", `# T\n\n${FUSED}\n`);
  expect(writeInput(e)).toStrictEqual({
    ...e,
    content: `# T\n\n${SPLIT}\n`,
  });
});

test("a `.mdx` path is rewritten, an upper-case extension too", () => {
  expect(writeInput(write("/w/a.mdx", FUSED)).content).toBe(SPLIT);
  expect(writeInput(write("/w/A.MD", FUSED)).content).toBe(SPLIT);
});

test("another file type passes on with the same input", () => {
  for (const f of ["/w/a.mjs", "/w/a.txt", "/w/a.md.bak", "/w/README"]) {
    const e = write(f, FUSED);
    expect(writeInput(e)).toBe(e);
  }
});

test("a write that needs no change passes on with the same input", () => {
  const e = write("/w/a.md", `${SPLIT}\n`);
  expect(writeInput(e)).toBe(e);
});

test("an edit changes only `new_string` and keeps `old_string` and the other fields", () => {
  const file = "# T\n\nOld line.\n\nTail.\n";
  const e = edit("/w/a.md", "Old line.", FUSED, { replace_all: false });
  expect(editInput(e, file)).toStrictEqual({ ...e, new_string: SPLIT });
});

test("an edit repairs a cross-sentence `old_string` first, then rewrites `new_string`", () => {
  const file = `# T\n\n${SPLIT}\n`;
  expect(editInput(edit("/w/a.md", FUSED, "Do it. Now."), file)).toStrictEqual({
    ...edit("/w/a.md", SPLIT, "Do it.\nNow."),
  });
});

test("an edit of a file that cannot be read passes on with the same input", () => {
  const e = edit("/w/a.md", "x", FUSED);
  expect(editInput(e, null)).toBe(e);
  const other = edit("/w/a.txt", "x", FUSED);
  expect(editInput(other, "x\n")).toBe(other);
});

test("an edit whose `new_string` is a fragment of a line stays unchanged", () => {
  const file = "Start here. And more text.\n";
  expect(
    rewriteEdit({ old_string: "Start", new_string: `${FUSED} Also` }, file),
  ).toBe(undefined);
  expect(
    rewriteEdit({ old_string: "more text.", new_string: FUSED }, file),
  ).toBe(undefined);
});

test("an edit of whole lines is rewritten, with a trailing newline kept", () => {
  const file = "a\nOld one.\nb\n";
  expect(
    rewriteEdit({ old_string: "Old one.\n", new_string: `${FUSED}\n` }, file),
  ).toBe(`${SPLIT}\n`);
});

test("an edit inside a code fence or a table row stays unchanged", () => {
  const fence = "```\nx\n```\n";
  expect(rewriteEdit({ old_string: "x", new_string: FUSED }, fence)).toBe(
    undefined,
  );
  const table = "| a | b |\n| --- | --- |\n| x | y |\n";
  expect(
    rewriteEdit(
      { old_string: "| x | y |", new_string: "| One. Two | y |" },
      table,
    ),
  ).toBe(undefined);
});

test("an edit with a missing file, a repeated `old_string`, or `replace_all` stays unchanged", () => {
  expect(rewriteEdit(edit("/w/a.md", "x", FUSED), null)).toBe(undefined);
  expect(rewriteEdit({ old_string: "x", new_string: FUSED }, "x\nx\n")).toBe(
    undefined,
  );
  expect(
    rewriteEdit(
      { old_string: "x", new_string: FUSED, replace_all: true },
      "x\n",
    ),
  ).toBe(undefined);
});

test("an `Edit` with an empty `old_string` makes a new file, so it is rewritten like a `Write`", () => {
  expect(rewriteEdit({ old_string: "", new_string: FUSED }, null)).toBe(SPLIT);
  expect(rewriteEdit({ old_string: "", new_string: FUSED }, "exists")).toBe(
    undefined,
  );
});

test("repair: a cross-sentence `old_string` that matches only in split form is split, with `new_string`", () => {
  const file = `${SPLIT}\n`;
  expect(repairEdit(file, FUSED, "Do it. Now.")).toStrictEqual({
    old_string: SPLIT,
    new_string: "Do it.\nNow.",
  });
});

test("repair: an `old_string` that matches as written, or in no form, is left alone", () => {
  expect(repairEdit(`${FUSED}\n`, FUSED, "x")).toBe(undefined);
  expect(repairEdit("other\n", FUSED, "x")).toBe(undefined);
  expect(repairEdit(`${SPLIT}\n`, "no sentence end", "x")).toBe(undefined);
});

test("repair: a file written before the hook keeps its normal match", () => {
  // The file holds the fused line, so the as-written `old_string` matches and the repair does nothing.
  expect(repairEdit(`${FUSED}\nTail.\n`, FUSED, FUSED)).toBe(undefined);
});
