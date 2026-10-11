// Tests of the `sembr` formatter on code, data, and block syntax that a split would change (spec semantic-line-breaks).

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  rewriteContent,
  rewriteEdit,
} from "../../../plugins/dotclaude/features/sembr/rules.mjs";
import { sembr } from "../../../plugins/dotclaude/lib/sembr.mjs";

test("leaves a line with data or code syntax alone", () => {
  for (const text of [
    '{"summary": "Done. Next step"}',
    'x = "Done. Next"',
    'say "a": "Done. Next"',
    'list [ "Done. Next" ]',
  ])
    assert.equal(sembr(text), text);
  assert.equal(rewriteContent('{"summary": "Done. Next step"}'), undefined);
});

test("still splits a line with a link or inline code", () => {
  assert.equal(
    sembr("See [the doc](a.md). Then `x = 1`. Done"),
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
  assert.equal(
    sembr(text),
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
  assert.equal(
    sembr(text),
    ["- Item.", "  Two", "", "        code. Here", "        more. Code"].join(
      "\n",
    ),
  );
});

test("still splits a continuation paragraph of a list item", () => {
  assert.equal(
    sembr("- Item\n\n  Para one. Para two"),
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
    assert.equal(sembr(text), text);
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
    assert.equal(sembr(text), text);
});

test("does not split a line above a setext underline", () => {
  assert.equal(sembr("First. Second\n---"), "First. Second\n---");
  assert.equal(sembr("First. Second\n==="), "First. Second\n===");
  assert.equal(sembr("First. Second\n\n---"), "First.\nSecond\n\n---");
});

test("an edit keeps all text of a deep blockquote line", () => {
  const file = "> > > Old\n";
  const input = {
    old_string: "> > > Old\n",
    new_string: "> > > Aa. Bb. Cc. Dd\n",
  };
  assert.equal(
    rewriteEdit(input, file),
    "> > > Aa.\n> > > Bb.\n> > > Cc.\n> > > Dd\n",
  );
});

test("an edit keeps the lines after a split blockquote line", () => {
  const file = "> Old\nkeep\n";
  const input = { old_string: "> Old\n", new_string: "> Aa. Bb\n" };
  assert.equal(rewriteEdit(input, file), "> Aa.\n> Bb\n");
});

test("leaves a table inside a blockquote alone", () => {
  const table = "> | Foo. Bar | c |\n> | --- | --- |\n> | One. Two | x |";
  assert.equal(sembr(table), table);
});

test("leaves the lines between `<pre>` and `</pre>` alone, in any case", () => {
  const block = "<PRE>\nOne. Two three.\n</Pre>";
  assert.equal(sembr(block), block);
  assert.equal(sembr(`${block}\nOne. Two.`), `${block}\nOne.\nTwo.`);
});

test("leaves the lines between `<code>` and `</code>` alone", () => {
  const block = "<code>\nOne. Two three.\n</code>";
  assert.equal(sembr(block), block);
});

test("leaves a `$$` math block alone and splits the text after it", () => {
  const math = "$$\na. B c.\n$$";
  assert.equal(sembr(math), math);
  assert.equal(sembr(`${math}\nOne. Two.`), `${math}\nOne.\nTwo.`);
});
