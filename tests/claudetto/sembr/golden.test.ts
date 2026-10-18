// Golden cases of the `sembr` rules: the output for fixed input must not change when the code is rewritten.
// `golden.json` holds the output of the rules for the inputs below.

import { expect, test } from "bun:test";
import {
  commandInput,
  editInput,
  repairEdit,
  rewriteCommand,
  rewriteEdit,
  writeInput,
} from "../../../src/plugins/claudetto/slices/sembr/domain/rewrite.ts";
import {
  format,
  sembr,
} from "../../../src/plugins/claudetto/slices/sembr/domain/split.ts";
import golden from "./golden.json";

const texts = [
  "One. Two. Three.",
  "Dr. Smith went home. He slept.",
  "See `a. b. c` now. Then go.",
  "Visit https://x.com/a. Then leave. Ok [a. b](c.d). Fine.",
  "# Head. Two.\n\nBody one. Body two.\n",
  "- Item one. Item two.\n  More here. And more.\n1. Num one. Num two.\n\nPara. Next.",
  "> Quote one. Quote two.\n> Again. Yes.",
  "```js\nfoo. bar.\n```\nAfter. Fence.\n~~~\nx. y.\n~~~",
  "---\ntitle: A. B.\n---\nText. More.",
  "| a. b | c |\n|---|---|\n| d. e | f |\n\nAfter. Table.",
  "<pre>\nA. B.\n</pre>\nOut. Side.\n$$\nx. y.\n$$\nEnd. Done.",
  "    indented. code.\nPara. Two.",
  "Line  \nhard. break.\nTitle\n=====\nA. B.",
  "import A from 'a'\nexport const x = {a: 1}\n\nProse. Here.",
  "Is it? Yes! Really... Maybe. 3.5 is a number. e.g. this.",
  "a. b\r\nc. D.\r\n",
  "- item\n\n      code. here.\n  Text. More.\n",
  'Use <b>x. y</b> tag. Next.\nThe key: "v". Done.',
  "1. First. Second.\n   - Nested. Sub.\n10) Ten. Ok.",
  "End. - not list. # not head. 1. not.",
];
const cmds = [
  "git commit -m \"$(cat <<'EOF'\nSubject. Here.\n\nBody one. Body two.\n\nCo-Authored-By: A <a@b>\nEOF\n)\"",
  'gh pr create --title "T. U." --body "$(cat <<\'EOF\'\nA. B.\n- c. d.\nEOF\n)"',
  "git commit -m \"$(cat <<'EOF'\nA. B.\nEOF\n)\"",
  "echo hi",
  "git commit -m \"$(cat <<'EOF'\nS\n\nEOF. x. EOF\nEOF\n)\"",
];
const file =
  "- Read the file.\n  Then edit it.\n\n> Quote one.\n> Quote two.\n\nPlain para. Another here.\r\nZ.\n";
const edits: [string, string, string | null][] = [
  ["- Read the file. Then edit it.", "- Open it. Close it.", file],
  ["Then edit it.", "Done. Yes.", file],
  ["Quote one. Quote two.", "Q1. Q2.", file],
  ["Plain para. Another here.", "New one. New two.", file],
  ["Plain para.", "A. B.", file],
  ["", "Hi. There.", null],
  ["x", "y. z.", file],
  ["Another here.", "K. L.\n", file],
];
const out = {
  split: texts.map((t) => [t, sembr(t), format(t).counts]),
  cmds: cmds.map((c) => [c, rewriteCommand(c)]),
  edits: edits.map(([o, n, f]) => [
    o,
    n,
    f,
    repairEdit(f, o, n),
    rewriteEdit({ old_string: o, new_string: n }, f),
    editInput(
      {
        tool: "Edit",
        tool_use_id: "t",
        file_path: "/w/a.md",
        old_string: o,
        new_string: n,
      },
      f,
    ),
  ]),
  write: ["A. B.", "A.\nB.\n"].flatMap((c) =>
    ["/w/a.md", "/w/a.ts"].map((p) => [
      p,
      c,
      writeInput({
        tool: "Write",
        tool_use_id: "t",
        file_path: p,
        content: c,
      }),
    ]),
  ),
  bash: cmds.map((c) =>
    commandInput({ tool: "Bash", tool_use_id: "t", command: c }),
  ),
};

test("the output of the rules matches the golden file", () => {
  expect(JSON.parse(JSON.stringify(out))).toStrictEqual(golden);
});
