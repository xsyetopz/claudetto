// The `sembr` rules for list items, quotes, and CRLF files (spec `semantic-breaks`).

import { expect, test } from "bun:test";
import {
  editInput,
  repairEdit,
  rewriteContent,
} from "../../../src/plugins/claudetto/slices/sembr/domain/rewrite.ts";
import { sembr } from "../../../src/plugins/claudetto/slices/sembr/domain/split.ts";

const edit = (old_string: string, new_string: string) => ({
  tool: "Edit" as const,
  tool_use_id: "t1",
  file_path: "/w/a.md",
  old_string,
  new_string,
});

test("an `old_string` with the marker of a list item is repaired and keeps the marker", () => {
  const file = "- Read the file.\n  Then edit it.\n";
  const out = editInput(
    edit("- Read the file. Then edit it.", "- Open it. Close it."),
    file,
  );
  expect(out.old_string).toBe("- Read the file.\n  Then edit it.");
  expect(out.new_string).toBe("- Open it.\n  Close it.");
});

test("an `old_string` inside a list item takes the indent of the item from the file", () => {
  const file = "- Read the file.\n  Then edit it.\n";
  const fix = repairEdit(file, "file. Then", "file. Next");
  expect(fix).toEqual({
    old_string: "file.\n  Then",
    new_string: "file.\n  Next",
  });
});

test("an `old_string` inside a quote line takes the quote mark from the file", () => {
  const file = "> Read the file.\n> Then edit it.\n";
  expect(repairEdit(file, "file. Then edit", "file. Then fix")).toEqual({
    old_string: "file.\n> Then edit",
    new_string: "file.\n> Then fix",
  });
});

test("a `new_string` with two sentences inside an item gets the indent of the item", () => {
  const file = "- Read the file.\n  Then edit it.\n";
  const fix = repairEdit(file, "file. Then", "file. Next. Last");
  expect(fix?.new_string).toBe("file.\n  Next.\n  Last");
});

test("an `old_string` that matches two places is not repaired", () => {
  const file = "- A one.\n  B two.\n- A one.\n  B two.\n";
  expect(repairEdit(file, "one. B", "one. C")).toBeUndefined();
});

test("a CRLF file with front matter keeps the front matter, and each line ends with CRLF", () => {
  const text = "---\r\ntitle: A. B.\r\n---\r\n\r\nRead it. Edit it.\r\n";
  expect(sembr(text)).toBe(
    "---\r\ntitle: A. B.\r\n---\r\n\r\nRead it.\r\nEdit it.\r\n",
  );
});

test("a CRLF write has no bare LF in the lines that the split adds", () => {
  const out = rewriteContent("One. Two. Three.\r\n") ?? "";
  expect(out).toBe("One.\r\nTwo.\r\nThree.\r\n");
  expect(out.replace(/\r\n/g, "")).not.toContain("\n");
});

test("a CRLF list item is split with the indent and the CRLF", () => {
  expect(sembr("- One. Two.\r\n")).toBe("- One.\r\n  Two.\r\n");
});

test("an edit of a CRLF file keeps the line endings in `new_string`", () => {
  const file = "Intro.\r\n\r\nRead it.\r\n";
  const out = editInput(edit("Read it.\r\n", "Read it. Edit it.\r\n"), file);
  expect(out.new_string).toBe("Read it.\r\nEdit it.\r\n");
});
