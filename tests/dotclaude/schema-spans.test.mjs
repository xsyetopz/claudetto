// The code spans of the schema descriptions (`tools/schema/spans.mjs`).
// The tests give the description texts as strings.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { applyCodeSpans, wrapCodeSpans } from "../../tools/schema.mjs";

const KEYS = new Set(["cleanupPeriodDays", "permissions", "model", "env"]);
const wrap = (text) => wrapCodeSpans(text, KEYS);

test.each([
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
])("%s goes in backticks", (_, text, want) => {
  expect(wrap(text)).toBe(want);
});

test.each([
  ["a key that is an English word", "the model and env of a session"],
  ["a word that is not a key", "macOS only, on claude.ai"],
  ["a single-word tool name", "Glob patterns and Read access"],
  ["a quoted phrase with a space", 'offers a "clear context" option'],
  ["a hyphen in prose", "non-matching URLs - none"],
  ["text in backticks", "already `cleanupPeriodDays` here"],
])("%s stays as it is", (_, text) => {
  expect(wrap(text)).toBe(text);
});

test("the spans change only descriptions, and the key names stay", () => {
  const schema = {
    properties: {
      description: { type: "string", description: "set to true" },
      model: { type: "string", default: "true" },
    },
  };
  expect(applyCodeSpans(schema)).toEqual({
    properties: {
      description: { type: "string", description: "set to `true`" },
      model: { type: "string", default: "true" },
    },
  });
});

test("each camelCase top-level key in a shipped description is in backticks", () => {
  const file = path.join(
    import.meta.dirname,
    "../../schemas/claude-code-settings.json",
  );
  const schema = JSON.parse(fs.readFileSync(file, "utf8"));
  const keys = Object.keys(schema.properties).filter((k) =>
    /[a-z][A-Z]/.test(k),
  );
  const bare = [];
  (function walk(node) {
    if (!node || typeof node !== "object") return;
    for (const [k, v] of Object.entries(node)) {
      if (k !== "description" || typeof v !== "string") walk(v);
      else {
        const prose = v.replace(/`[^`]*`/g, "");
        for (const key of keys)
          if (new RegExp(`\\b${key}\\b`).test(prose)) bare.push(key);
      }
    }
  })(schema);
  expect(bare).toEqual([]);
});
