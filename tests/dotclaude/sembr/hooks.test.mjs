// The pure rules of the `sembr` handlers of the hooks module (spec semantic-line-breaks, design D29):
// the rewrite of `Write` and `Edit`, and the repair of a cross-sentence `old_string`.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  editInput,
  repairEdit,
  rewriteEdit,
  writeInput,
} from "../../../plugins/dotclaude/features/sembr/rules.mjs";

const FUSED = "Read the file. Then edit it.";
const SPLIT = "Read the file.\nThen edit it.";
const write = (file_path, content) => ({ tool: "Write", file_path, content });
const edit = (file_path, old_string, new_string, extra = {}) => ({
  tool: "Edit",
  file_path,
  old_string,
  new_string,
  ...extra,
});

test("a fused write of a `.md` file is split, and the other fields stay", () => {
  const e = { ...write("/w/a.md", `# T\n\n${FUSED}\n`), tool_use_id: "t1" };
  assert.deepEqual(writeInput(e), {
    ...e,
    content: `# T\n\n${SPLIT}\n`,
  });
});

test("a `.mdx` path is rewritten, an upper-case extension too", () => {
  assert.equal(writeInput(write("/w/a.mdx", FUSED)).content, SPLIT);
  assert.equal(writeInput(write("/w/A.MD", FUSED)).content, SPLIT);
});

test("another file type passes on with the same input", () => {
  for (const f of ["/w/a.mjs", "/w/a.txt", "/w/a.md.bak", "/w/README"]) {
    const e = write(f, FUSED);
    assert.equal(writeInput(e), e);
  }
});

test("a write that needs no change passes on with the same input", () => {
  const e = write("/w/a.md", `${SPLIT}\n`);
  assert.equal(writeInput(e), e);
});

test("an edit changes only `new_string` and keeps `old_string` and the other fields", () => {
  const file = "# T\n\nOld line.\n\nTail.\n";
  const e = edit("/w/a.md", "Old line.", FUSED, { replace_all: false });
  assert.deepEqual(editInput(e, file), { ...e, new_string: SPLIT });
});

test("an edit repairs a cross-sentence `old_string` first, then rewrites `new_string`", () => {
  const file = `# T\n\n${SPLIT}\n`;
  assert.deepEqual(editInput(edit("/w/a.md", FUSED, "Do it. Now."), file), {
    ...edit("/w/a.md", SPLIT, "Do it.\nNow."),
  });
});

test("an edit of a file that cannot be read passes on with the same input", () => {
  const e = edit("/w/a.md", "x", FUSED);
  assert.equal(editInput(e, null), e);
  const other = edit("/w/a.txt", "x", FUSED);
  assert.equal(editInput(other, "x\n"), other);
});

test("an edit whose `new_string` is a fragment of a line stays unchanged", () => {
  const file = "Start here. And more text.\n";
  assert.equal(
    rewriteEdit({ old_string: "Start", new_string: `${FUSED} Also` }, file),
    undefined,
  );
  assert.equal(
    rewriteEdit({ old_string: "more text.", new_string: FUSED }, file),
    undefined,
  );
});

test("an edit of whole lines is rewritten, with a trailing newline kept", () => {
  const file = "a\nOld one.\nb\n";
  assert.equal(
    rewriteEdit({ old_string: "Old one.\n", new_string: `${FUSED}\n` }, file),
    `${SPLIT}\n`,
  );
});

test("an edit inside a code fence or a table row stays unchanged", () => {
  const fence = "```\nx\n```\n";
  assert.equal(
    rewriteEdit({ old_string: "x", new_string: FUSED }, fence),
    undefined,
  );
  const table = "| a | b |\n| --- | --- |\n| x | y |\n";
  assert.equal(
    rewriteEdit(
      { old_string: "| x | y |", new_string: "| One. Two | y |" },
      table,
    ),
    undefined,
  );
});

test("an edit with a missing file, a repeated `old_string`, or `replace_all` stays unchanged", () => {
  assert.equal(rewriteEdit(edit("/w/a.md", "x", FUSED), null), undefined);
  assert.equal(
    rewriteEdit({ old_string: "x", new_string: FUSED }, "x\nx\n"),
    undefined,
  );
  assert.equal(
    rewriteEdit(
      { old_string: "x", new_string: FUSED, replace_all: true },
      "x\n",
    ),
    undefined,
  );
});

test("an `Edit` with an empty `old_string` makes a new file, so it is rewritten like a `Write`", () => {
  assert.equal(rewriteEdit({ old_string: "", new_string: FUSED }, null), SPLIT);
  assert.equal(
    rewriteEdit({ old_string: "", new_string: FUSED }, "exists"),
    undefined,
  );
});

test("repair: a cross-sentence `old_string` that matches only in split form is split, with `new_string`", () => {
  const file = `${SPLIT}\n`;
  assert.deepEqual(repairEdit(file, FUSED, "Do it. Now."), {
    old_string: SPLIT,
    new_string: "Do it.\nNow.",
  });
});

test("repair: an `old_string` that matches as written, or in no form, is left alone", () => {
  assert.equal(repairEdit(`${FUSED}\n`, FUSED, "x"), undefined);
  assert.equal(repairEdit("other\n", FUSED, "x"), undefined);
  assert.equal(repairEdit(`${SPLIT}\n`, "no sentence end", "x"), undefined);
});

test("repair: a file written before the hook keeps its normal match", () => {
  // The file holds the fused line, so the as-written `old_string` matches and the repair does nothing.
  assert.equal(repairEdit(`${FUSED}\nTail.\n`, FUSED, FUSED), undefined);
});
