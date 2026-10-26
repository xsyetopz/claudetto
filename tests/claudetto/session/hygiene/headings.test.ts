// Tests of the heading reader of the `hygiene` slice (task 10.11): the Title Case of ATX headings only.

import { expect, test } from "bun:test";
import { titleHeadings } from "../../../../plugins/claudetto/modules/session/hygiene/domain/headings.ts";

test("each ATX heading gets the Title Case, and the text between stays", () => {
  const out = titleHeadings(
    "# guide to the `hooks` module\n\ntext of the guide\n\n## what to do with it ##\n",
  );
  expect(out.text).toBe(
    "# Guide to the `hooks` Module\n\ntext of the guide\n\n## What to Do with It ##\n",
  );
  expect(out.changed).toBe(2);
});

test("front matter and fenced code blocks stay as they are", () => {
  const text = [
    "---",
    "# not a heading: a comment",
    "---",
    "# a title",
    "```sh",
    "# a comment in code",
    "```",
    "~~~~",
    "# in a longer fence",
    "~~~",
    "# still in the fence",
    "~~~~",
    "## after the fence",
  ].join("\n");
  const out = titleHeadings(text);
  expect(out.text.split("\n")).toStrictEqual([
    "---",
    "# not a heading: a comment",
    "---",
    "# A Title",
    "```sh",
    "# a comment in code",
    "```",
    "~~~~",
    "# in a longer fence",
    "~~~",
    "# still in the fence",
    "~~~~",
    "## After the Fence",
  ]);
  expect(out.changed).toBe(2);
});

test("a line that is no heading stays: no space after `#`, an indented code line, and a tag", () => {
  const text = "#hashtag here\n    # code line\n####### seven\n";
  expect(titleHeadings(text)).toStrictEqual({ text, changed: 0 });
});

test("a heading in the right case and a CRLF file give no change", () => {
  const right = "# Fresh Install\r\n\r\ntext\r\n";
  expect(titleHeadings(right)).toStrictEqual({ text: right, changed: 0 });
  expect(titleHeadings("# fresh install\r\n").text).toBe("# Fresh Install\r\n");
});
