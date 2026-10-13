// dcc-plugin-you-should-know: the pure rules of the `notice` slice, which call changes something and what an answer shows.
// The hook behavior is in the lab tests of the slice.

import { expect, test } from "bun:test";
import {
  actionOf,
  isBashRead,
  isChange,
  isRepeat,
  topicOf,
} from "../../src/plugins/dcc-plugin-you-should-know/slices/notice/domain/notice.ts";

test("a `Bash` command of read programs only is a read", () => {
  for (const command of [
    "cat a.txt | head -5",
    "ls -la && wc -l src/*.ts",
    "git status --short; git diff HEAD~1",
    "rg TODO src 2>/dev/null",
    "find . -name '*.ts'",
    "sed -n 1,5p a.txt",
  ])
    expect(isBashRead(command)).toBeTrue();
});

test("a `Bash` command that writes, deletes, or runs code is not a read", () => {
  for (const command of [
    "cat a > b",
    "rm -rf build",
    "find . -name '*.tmp' -delete",
    "find . -exec rm {} +",
    "sed -i 's/a/b/' x",
    "git commit -m wip",
    "python3 -c 'print(1)'",
    "npm install",
    "ls $(rm x)",
  ])
    expect(isBashRead(command)).toBeFalse();
});

test("an edit, a write, and a notebook edit change something, and a read tool does not", () => {
  expect(isChange("Edit", { file_path: "a" })).toBeTrue();
  expect(isChange("Write", { file_path: "a" })).toBeTrue();
  expect(isChange("NotebookEdit", { notebook_path: "a" })).toBeTrue();
  expect(isChange("Read", { file_path: "a" })).toBeFalse();
  expect(isChange("Bash", { command: "ls" })).toBeFalse();
  expect(isChange("Bash", {})).toBeFalse();
});

test("the action text names the tool and its arguments, and a long input is cut", () => {
  expect(actionOf("Edit", { file_path: "/p/a.ts" })).toContain("/p/a.ts");
  const long = actionOf("Write", { content: "x".repeat(10000) });
  expect(long.length).toBeLessThan(4100);
  expect(long).toEndWith("[cut]");
});

test("an answer of `NONE` or of blank lines gives no topic", () => {
  expect(topicOf("NONE")).toBeUndefined();
  expect(topicOf("none.")).toBeUndefined();
  expect(topicOf("\n  \n")).toBeUndefined();
});

test("a topic is the first line of the answer, with no list mark or quotes", () => {
  expect(topicOf('\n- "The cache keeps old data."\nMore text.')).toBe(
    "The cache keeps old data.",
  );
});

test("a topic with other case or punctuation is a repeat", () => {
  expect(
    isRepeat("the cache keeps old data", ["The cache keeps old data."]),
  ).toBeTrue();
  expect(
    isRepeat("The retry has no delay.", ["The cache keeps old data."]),
  ).toBeFalse();
});
