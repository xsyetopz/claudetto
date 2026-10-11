// Tests of the `sembr` formatter on code, data, and block syntax that a split would change (spec semantic-line-breaks).

import { expect, test } from "bun:test";
import {
  rewriteContent,
  rewriteEdit,
} from "../../../plugins/dotclaude/features/sembr/rules.ts";
import { sembr } from "../../../plugins/dotclaude/lib/sembr.ts";

test("leaves a line with data or code syntax alone", () => {
  for (const text of [
    '{"summary": "Done. Next step"}',
    'x = "Done. Next"',
    'say "a": "Done. Next"',
    'list [ "Done. Next" ]',
  ])
    expect(sembr(text)).toBe(text);
  expect(rewriteContent('{"summary": "Done. Next step"}')).toBe(undefined);
});

test("still splits a line with a link or inline code", () => {
  expect(sembr("See [the doc](a.md). Then `x = 1`. Done")).toBe(
    "See [the doc](a.md).\nThen `x = 1`.\nDone",
  );
});

test("keeps a fence inside a blockquote", () => {
  const text = [
    "> ```js",
    '> console.log("a. B");',
    "> ```",
    "> One. Two",
  ].join("\n");
  expect(sembr(text)).toBe(
    ["> ```js", '> console.log("a. B");', "> ```", "> One.", "> Two"].join(
      "\n",
    ),
  );
});

test("keeps indented code under a list item", () => {
  const text = [
    "- Item. Two",
    "",
    "        code. Here",
    "        more. Code",
  ].join("\n");
  expect(sembr(text)).toBe(
    ["- Item.", "  Two", "", "        code. Here", "        more. Code"].join(
      "\n",
    ),
  );
});

test("still splits a continuation paragraph of a list item", () => {
  expect(sembr("- Item\n\n  Para one. Para two")).toBe(
    "- Item\n\n  Para one.\n  Para two",
  );
});

test("keeps import, export, and JSX lines of .mdx", () => {
  for (const text of [
    'export const meta = { title: "Done. Next" }',
    'import A from "a.js"\n\nexport const b = {\n  title: "Done. Next",\n}',
    '<Card title="Hi. There" />',
    '  title="Hi. There"',
  ])
    expect(sembr(text)).toBe(text);
});

test("does not split before a fence, a list marker, or a heading marker", () => {
  for (const text of [
    "Text. ```python",
    "Text. ~~~",
    "Note. * x",
    "Note. - x",
    "Note. + x",
    "Note. 1. x",
    "Note. 2) x",
    "Note. # x",
  ])
    expect(sembr(text)).toBe(text);
});

test("does not split a line above a setext underline", () => {
  expect(sembr("First. Second\n---")).toBe("First. Second\n---");
  expect(sembr("First. Second\n===")).toBe("First. Second\n===");
  expect(sembr("First. Second\n\n---")).toBe("First.\nSecond\n\n---");
});

test("an edit keeps all text of a deep blockquote line", () => {
  const file = "> > > Old\n";
  const input = {
    old_string: "> > > Old\n",
    new_string: "> > > Aa. Bb. Cc. Dd\n",
  };
  expect(rewriteEdit(input, file)).toBe(
    "> > > Aa.\n> > > Bb.\n> > > Cc.\n> > > Dd\n",
  );
});

test("an edit keeps the lines after a split blockquote line", () => {
  const file = "> Old\nkeep\n";
  const input = { old_string: "> Old\n", new_string: "> Aa. Bb\n" };
  expect(rewriteEdit(input, file)).toBe("> Aa.\n> Bb\n");
});

test("leaves a table inside a blockquote alone", () => {
  const table = "> | Foo. Bar | c |\n> | --- | --- |\n> | One. Two | x |";
  expect(sembr(table)).toBe(table);
});

test("leaves the lines between `<pre>` and `</pre>` alone, in any case", () => {
  const block = "<PRE>\nOne. Two three.\n</Pre>";
  expect(sembr(block)).toBe(block);
  expect(sembr(`${block}\nOne. Two.`)).toBe(`${block}\nOne.\nTwo.`);
});

test("leaves the lines between `<code>` and `</code>` alone", () => {
  const block = "<code>\nOne. Two three.\n</code>";
  expect(sembr(block)).toBe(block);
});

test("leaves a `$$` math block alone and splits the text after it", () => {
  const math = "$$\na. B c.\n$$";
  expect(sembr(math)).toBe(math);
  expect(sembr(`${math}\nOne. Two.`)).toBe(`${math}\nOne.\nTwo.`);
});
