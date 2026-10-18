// Behavior of the custom markdownlint rule `title-case` (design D52), run through the `markdownlint` library.

import { expect, test } from "bun:test";
import { lint } from "markdownlint-cli2/markdownlint/promise";
import rule from "../../../tools/lint/title-case.ts";

const run = async (text: string) => {
  const { text: found } = await lint({
    strings: { text },
    customRules: [rule],
    config: { default: false, "title-case": true },
  });
  return found ?? [];
};

test("a heading in the wrong case is flagged, with the fix", async () => {
  const [error] = await run("# What i need from you\n");
  expect(error?.lineNumber).toBe(1);
  expect(error?.fixInfo?.insertText).toBe("# What I Need from You");
});

test("a right heading, a version heading, and a heading in a fence give no error", async () => {
  const text =
    "# Install the Core Plugin\n\n## [0.2.0] - 2026-10-18\n\n## [Unreleased]\n\n```md\n# in a fence\n```\n";
  expect(await run(text)).toEqual([]);
});

test("inline code and a link target do not change", async () => {
  const text = "# Run `cat F` and See [the Page](the-page)\n";
  expect(await run(text)).toEqual([]);
});
