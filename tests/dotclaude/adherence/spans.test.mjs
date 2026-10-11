// The code-span deny of the `adherence` hooks (design D34, cases F1 to F3) with texts as strings.
// No file is read and no command runs.

import assert from "node:assert/strict";
import { test } from "node:test";
import { decide } from "../../../plugins/dotclaude/features/adherence/cli.mjs";
import {
  bareItems,
  commitMessage,
  prose,
} from "../../../plugins/dotclaude/features/adherence/spans.mjs";

const NO_IO = {
  read: () => null,
  exists: () => false,
  transcript: () => null,
};
const write = (file_path, content) => ({
  tool_name: "Write",
  cwd: "/w",
  tool_input: { file_path, content },
});
const bash = (command) => ({
  tool_name: "Bash",
  cwd: "/w",
  tool_input: { command },
});
const reason = (payload, io = NO_IO) =>
  decide(payload, {}, io)?.hookSpecificOutput;

for (const [_, text, items] of [
  ["a file with a slash", "edit src/app/main.mjs now", ["src/app/main.mjs"]],
  ["a file name", "see CLAUDE.md and hooks.json.", ["CLAUDE.md", "hooks.json"]],
  ["a dot file", "from .mcp.json", [".mcp.json"]],
  ["a home path", "in ~/.claude/skills", ["~/.claude/skills"]],
  [
    "a path of a known folder",
    "put it in tests/dotclaude",
    ["tests/dotclaude"],
  ],
  ["a folder with a slash at the end", "the tests/ folder", ["tests/"]],
  ["an absolute path", "reads /etc/hosts here", ["/etc/hosts"]],
  ["a line number after a path", "at lib/budget.mjs:12.", ["lib/budget.mjs"]],
  ["a snake_case name", "the max_lines key", ["max_lines"]],
  [
    "a camelCase name",
    "set maxTurns and cleanupPeriodDays",
    ["maxTurns", "cleanupPeriodDays"],
  ],
  ["a SCREAMING_CASE name", "the DISABLE_COMPACT switch", ["DISABLE_COMPACT"]],
  ["an env var with a value", "run FOO=1 first", ["FOO=1"]],
  [
    "an env var with a dollar",
    `uses $HOME and \${TMPDIR}`,
    ["$HOME", `\${TMPDIR}`],
  ],
  [
    "a call",
    "calls parse() then JSON.parse(text)",
    ["parse()", "JSON.parse(text)"],
  ],
  ["a long flag", "pass --force or --no-verify", ["--force", "--no-verify"]],
  ["a flag with a value", "use --model=opus", ["--model=opus"]],
]) {
  test(`${_} is a bare code item`, () => {
    assert.deepEqual(bareItems(text), items);
  });
}

for (const [_, text] of [
  [
    "plain English",
    "Keep the change small and say what you did. Do not guess.",
  ],
  [
    "words with a slash",
    "A yes/no answer, and/or a read/write pair, 24/7, I/O, and TCP/IP.",
  ],
  ["three words with slashes", "the read/write/execute bits"],
  ["a date", "on 2026/10/09 or 10/10"],
  [
    "product names",
    "Node.js, macOS, iOS, iPhone, eBay, GitHub, JavaScript, and TypeScript",
  ],
  ["a plural in parentheses", "each file(s) and (a note about it)"],
  ["an all-capital word", "the API, the HTTP layer, and a NOT here"],
  ["a dash", "one -- two and a - b and a built-in help"],
  ["a domain", "claude.ai and example.com"],
  ["an abbreviation", "e.g. this, i.e. that, etc."],
  [
    "a URL",
    "see https://github.com/xsyetopz/dotclaude/blob/main/src/a_b.mjs now",
  ],
  ["a mail address", "write to first_last@example.com"],
  [
    "text in backticks",
    "see `src/app.mjs`, `max_lines`, `--force`, and ``a_b.mjs``",
  ],
  ["a span over two lines", "see `src/a.mjs\nand lib/b.mjs` here"],
  ["a link target", "read [the guide](docs/guide_one.md) now"],
  ["a reference definition", "[guide]: docs/guide_one.md"],
  ["an HTML comment", "<!-- see src/a.mjs -->"],
]) {
  test(`${_} is no code item`, () => {
    assert.deepEqual(bareItems(text), []);
  });
}

test("a fenced block and frontmatter hold no bare item", () => {
  const text = [
    "---",
    "name: my_skill",
    "---",
    "",
    "```bash",
    "node src/run.mjs --force",
    "```",
    "",
    "~~~",
    "FOO_BAR=1",
    "~~~",
    "",
    "Plain text.",
  ].join("\n");
  assert.deepEqual(bareItems(text), []);
  assert.equal(prose(text).trim(), "Plain text.");
});

test("text that starts inside a fenced block holds no bare item until the fence ends", () => {
  assert.deepEqual(bareItems("node src/run.mjs\n```\nthen src/run.mjs", true), [
    "src/run.mjs",
  ]);
});

test("a heading is prose and the check covers it", () => {
  assert.deepEqual(bareItems("## The max_lines key"), ["max_lines"]);
});

test("a `Write` of a `.md` file with a bare item is denied and names the item", () => {
  const out = reason(
    write("/w/notes.md", "Run `just check` and edit src/app.mjs."),
  );
  assert.equal(out.permissionDecision, "deny");
  assert.ok(
    out.permissionDecisionReason.includes("`src/app.mjs`"),
    out.permissionDecisionReason,
  );
  assert.ok(
    !out.permissionDecisionReason.includes("`just check`"),
    out.permissionDecisionReason,
  );
});

test("a `Write` of a `.md` file with spans, and of a `.mjs` file, passes", () => {
  assert.equal(
    reason(write("/w/notes.md", "Edit `src/app.mjs` now.")),
    undefined,
  );
  assert.equal(
    reason(write("/w/app.mjs", "// edit src/app.mjs and max_lines")),
    undefined,
  );
});

test("the deny lists at most eight items and counts the rest", () => {
  const text = Array.from({ length: 11 }, (_, i) => `item_${i}`).join(" ");
  const out = reason(write("/w/n.md", text)).permissionDecisionReason;
  assert.ok(out.includes("`item_7`"), out);
  assert.ok(!out.includes("`item_8`"), out);
  assert.match(out, /\b3\b/);
});

test("an `Edit` counts only the items that the edit adds", () => {
  const file = "Old line with old_name here.\nSecond line.\n";
  const io = { ...NO_IO, read: () => file };
  const edit = (new_string) => ({
    tool_name: "Edit",
    cwd: "/w",
    tool_input: {
      file_path: "/w/n.md",
      old_string: "Second line.",
      new_string,
    },
  });
  assert.equal(reason(edit("Second line, now longer."), io), undefined);
  assert.ok(
    reason(edit("Use new_name."), io).permissionDecisionReason.includes(
      "`new_name`",
    ),
    reason(edit("Use new_name."), io).permissionDecisionReason,
  );
});

test("an `Edit` inside a fenced block of the file passes", () => {
  const file = "Text.\n\n```js\nconst a = 1;\n```\n";
  const io = { ...NO_IO, read: () => file };
  const out = reason(
    {
      tool_name: "Edit",
      cwd: "/w",
      tool_input: {
        file_path: "/w/n.md",
        old_string: "const a = 1;",
        new_string: "const max_lines = 1;",
      },
    },
    io,
  );
  assert.equal(out, undefined);
});

test("an `Edit` with an `old_string` that is not in the file checks the new text alone", () => {
  const io = { ...NO_IO, read: () => "other" };
  const out = reason(
    {
      tool_name: "Edit",
      cwd: "/w",
      tool_input: {
        file_path: "/w/n.md",
        old_string: "gone",
        new_string: "see max_lines",
      },
    },
    io,
  );
  assert.equal(out.permissionDecision, "deny");
});

test("a `git commit` heredoc message with a bare item is denied", () => {
  const command = [
    "git commit -m \"$(cat <<'EOF'",
    "fix: stop the guard on max_lines",
    "",
    "Change lib/budget.mjs and keep `ok_name`.",
    "",
    "Co-Authored-By: Claude <noreply@anthropic.com>",
    "EOF",
    ')"',
  ].join("\n");
  assert.deepEqual(bareItems(commitMessage(command)), [
    "max_lines",
    "lib/budget.mjs",
  ]);
  const out = reason(bash(command));
  assert.equal(out.permissionDecision, "deny");
  assert.ok(
    out.permissionDecisionReason.includes("`lib/budget.mjs`"),
    out.permissionDecisionReason,
  );
});

test("a `git commit -m` message is checked, and a clean one passes", () => {
  assert.equal(
    reason(bash('git commit -m "fix: change lib/budget.mjs"'))
      .permissionDecision,
    "deny",
  );
  assert.equal(
    reason(bash("git commit -m 'fix: change `lib/budget.mjs`'")),
    undefined,
  );
  assert.equal(reason(bash('git commit -m "fix the guard"')), undefined);
});

test("a command that is not `git commit` has no message", () => {
  assert.equal(commitMessage("echo -m 'a_b'"), undefined);
  assert.equal(commitMessage("git status"), undefined);
  assert.equal(commitMessage("git commit --amend --no-edit"), undefined);
});

test("a message with a command substitution in `-m` is left alone", () => {
  assert.equal(reason(bash('git commit -m "$(date) a_b"')), undefined);
});
