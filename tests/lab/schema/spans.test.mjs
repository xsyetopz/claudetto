// The code spans of the schema descriptions (`features/schema/spans.mjs` of `dotclaude-lab`).
// The tests give the description texts as strings.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyCodeSpans,
  wrapCodeSpans,
} from "../../../plugins/dotclaude-lab/features/schema/build.mjs";

const KEYS = new Set(["cleanupPeriodDays", "permissions", "model", "env"]);
const wrap = (text) => wrapCodeSpans(text, KEYS);

const BACKTICKED = [
  ["a camelCase key", "after cleanupPeriodDays", "after `cleanupPeriodDays`"],
  ["a dotted key", "see permissions.allow", "see `permissions.allow`"],
  [
    "a home path",
    "in ~/.claude/skills/synced now",
    "in `~/.claude/skills/synced` now",
  ],
  ["a dot file", "from .mcp.json", "from `.mcp.json`"],
  ["a file name", "loads CLAUDE.md files", "loads `CLAUDE.md` files"],
  ["a slash command", "the /model picker", "the `/model` picker"],
  ["a long flag", "use --settings or -p", "use `--settings` or `-p`"],
  [
    "an env var with a value",
    "like CLAUDE_CODE_NO_FLICKER=1)",
    "like `CLAUDE_CODE_NO_FLICKER=1`)",
  ],
  ["a snake_case name", "its client_id", "its `client_id`"],
  ["a literal", "Set to false.", "Set to `false`."],
  ["a quoted literal", `"default" or 'accept'`, "`default` or `accept`"],
  ["an inline JSON object", `e.g. {"jj": "<Esc>"}.`, 'e.g. `{"jj": "<Esc>"}`.'],
  ["a permission rule", "Read(...) deny rules", "`Read(...)` deny rules"],
  ["a tool name", "the SendFeedback tool", "the `SendFeedback` tool"],
  ["a URL", "see https://example.com/a.", "see `https://example.com/a`."],
];
for (const [name, text, want] of BACKTICKED) {
  test(`${name} goes in backticks`, () => {
    assert.equal(wrap(text), want);
  });
}

const UNCHANGED = [
  ["a key that is an English word", "the model and env of a session"],
  ["a word that is not a key", "macOS only, on claude.ai"],
  ["a single-word tool name", "Glob patterns and Read access"],
  ["a quoted phrase with a space", 'offers a "clear context" option'],
  ["a hyphen in prose", "non-matching URLs - none"],
  ["text in backticks", "already `cleanupPeriodDays` here"],
];
for (const [name, text] of UNCHANGED) {
  test(`${name} stays as it is`, () => {
    assert.equal(wrap(text), text);
  });
}

test("the spans change only descriptions, and the key names stay", () => {
  const schema = {
    properties: {
      description: { type: "string", description: "set to true" },
      model: { type: "string", default: "true" },
    },
  };
  assert.deepEqual(applyCodeSpans(schema), {
    properties: {
      description: { type: "string", description: "set to `true`" },
      model: { type: "string", default: "true" },
    },
  });
});
