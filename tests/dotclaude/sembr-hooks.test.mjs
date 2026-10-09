// The silent `sembr` hooks (spec semantic-line-breaks, design D29):
// the `PreToolUse` rewrite of `Write` and `Edit`, the repair of a cross-sentence `old_string`, and the `Stop` count.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  count,
  logFile,
  rewrite,
} from "../../plugins/dotclaude/features/sembr/cli.mjs";
import {
  chatCounts,
  repairEdit,
  rewriteEdit,
} from "../../plugins/dotclaude/features/sembr/rules.mjs";

const FUSED = "Read the file. Then edit it.";
const SPLIT = "Read the file.\nThen edit it.";
const write = (file_path, content) => ({
  tool_name: "Write",
  cwd: "/w",
  tool_input: { file_path, content },
});
const edit = (file_path, old_string, new_string, extra = {}) => ({
  tool_name: "Edit",
  cwd: "/w",
  tool_input: { file_path, old_string, new_string, ...extra },
});

test("a fused write of a `.md` file is split, and the output has only `updatedInput`", () => {
  const out = rewrite(write("/w/a.md", `# T\n\n${FUSED}\n`));
  expect(out).toEqual({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      updatedInput: { file_path: "/w/a.md", content: `# T\n\n${SPLIT}\n` },
    },
  });
  const keys = Object.keys(out.hookSpecificOutput);
  expect(keys).not.toContain("permissionDecision");
  expect(keys).not.toContain("additionalContext");
  expect(Object.keys(out)).not.toContain("systemMessage");
});

test("a `.mdx` path is rewritten, an upper-case extension too", () => {
  expect(rewrite(write("/w/a.mdx", FUSED))).toBeDefined();
  expect(rewrite(write("/w/A.MD", FUSED))).toBeDefined();
});

test("another file type gives no output", () => {
  for (const f of ["/w/a.mjs", "/w/a.txt", "/w/a.md.bak", "/w/README"])
    expect(rewrite(write(f, FUSED))).toBeUndefined();
});

test("a write that needs no change gives no output", () => {
  expect(rewrite(write("/w/a.md", `${SPLIT}\n`))).toBeUndefined();
});

test("an edit that changes only `new_string` keeps `old_string` and the other fields", () => {
  const file = "# T\n\nOld line.\n\nTail.\n";
  const out = rewrite(
    edit("/w/a.md", "Old line.", FUSED, { replace_all: false }),
    () => file,
  );
  expect(out.hookSpecificOutput.updatedInput).toEqual({
    file_path: "/w/a.md",
    old_string: "Old line.",
    new_string: SPLIT,
    replace_all: false,
  });
  expect(Object.keys(out.hookSpecificOutput)).not.toContain(
    "permissionDecision",
  );
});

test("an edit whose `new_string` is a fragment of a line stays unchanged", () => {
  const file = "Start here. And more text.\n";
  expect(
    rewriteEdit({ old_string: "Start", new_string: `${FUSED} Also` }, file),
  ).toBeUndefined();
  expect(
    rewriteEdit({ old_string: "more text.", new_string: FUSED }, file),
  ).toBeUndefined();
});

test("an edit of whole lines is rewritten, with a trailing newline kept", () => {
  const file = "a\nOld one.\nb\n";
  expect(
    rewriteEdit({ old_string: "Old one.\n", new_string: `${FUSED}\n` }, file),
  ).toBe(`${SPLIT}\n`);
});

test("an edit inside a code fence or a table row stays unchanged", () => {
  const fence = "```\nx\n```\n";
  expect(
    rewriteEdit({ old_string: "x", new_string: FUSED }, fence),
  ).toBeUndefined();
  const table = "| a | b |\n| --- | --- |\n| x | y |\n";
  expect(
    rewriteEdit(
      { old_string: "| x | y |", new_string: "| One. Two | y |" },
      table,
    ),
  ).toBeUndefined();
});

test("an edit with a missing file, a repeated `old_string`, or `replace_all` stays unchanged", () => {
  expect(rewrite(edit("/w/a.md", "x", FUSED), () => null)).toBeUndefined();
  expect(
    rewriteEdit({ old_string: "x", new_string: FUSED }, "x\nx\n"),
  ).toBeUndefined();
  expect(
    rewriteEdit(
      { old_string: "x", new_string: FUSED, replace_all: true },
      "x\n",
    ),
  ).toBeUndefined();
});

test("an `Edit` with an empty `old_string` makes a new file, so it is rewritten like a `Write`", () => {
  expect(rewriteEdit({ old_string: "", new_string: FUSED }, null)).toBe(SPLIT);
  expect(
    rewriteEdit({ old_string: "", new_string: FUSED }, "exists"),
  ).toBeUndefined();
});

test("repair: a cross-sentence `old_string` that matches only in split form is split, with `new_string`", () => {
  const file = `${SPLIT}\n`;
  expect(repairEdit(file, FUSED, "Do it. Now.")).toEqual({
    old_string: SPLIT,
    new_string: "Do it.\nNow.",
  });
});

test("repair: an `old_string` that matches as written, or in no form, is left alone", () => {
  expect(repairEdit(`${FUSED}\n`, FUSED, "x")).toBeUndefined();
  expect(repairEdit("other\n", FUSED, "x")).toBeUndefined();
  expect(repairEdit(`${SPLIT}\n`, "no sentence end", "x")).toBeUndefined();
});

test("repair: a file written before the hook keeps its normal match", () => {
  // The file holds the fused line, so the as-written `old_string` matches and the repair does nothing.
  expect(repairEdit(`${FUSED}\nTail.\n`, FUSED, FUSED)).toBeUndefined();
});

test("the `Stop` count: three lines and one with two sentences", () => {
  expect(chatCounts(`Short line.\n${FUSED}\nLast one`)).toEqual({
    lines: 3,
    multi: 1,
  });
  expect(chatCounts("")).toEqual({ lines: 0, multi: 0 });
  expect(chatCounts("```\nA. B. C.\n```\n\nOne. Two.")).toEqual({
    lines: 4,
    multi: 1,
  });
});

test("the `Stop` hook appends the counts to the log and prints nothing", () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), "sembr-"));
  const env = { CLAUDE_PLUGIN_DATA: data };
  const payload = {
    hook_event_name: "Stop",
    session_id: "s1",
    last_assistant_message: `One.\n${FUSED}\nThree`,
  };
  expect(count(payload, env, () => 0)).toBeUndefined();
  count(payload, env, () => 0);
  const rows = fs
    .readFileSync(logFile(env), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  expect(rows).toEqual([
    { ts: "1970-01-01T00:00:00.000Z", session_id: "s1", lines: 3, multi: 1 },
    { ts: "1970-01-01T00:00:00.000Z", session_id: "s1", lines: 3, multi: 1 },
  ]);
});

test("run as a script: `Stop` prints nothing and exits `0`, `PreToolUse` prints `updatedInput`", () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), "sembr-"));
  const cli = path.join(
    import.meta.dirname,
    "../../plugins/dotclaude/features/sembr/cli.mjs",
  );
  const run = (payload) =>
    Bun.spawnSync(["node", cli], {
      stdin: new TextEncoder().encode(JSON.stringify(payload)),
      env: { ...process.env, CLAUDE_PLUGIN_DATA: data },
    });
  const stop = run({
    hook_event_name: "Stop",
    session_id: "s",
    last_assistant_message: FUSED,
  });
  expect(stop.exitCode).toBe(0);
  expect(stop.stdout.toString()).toBe("");
  expect(
    JSON.parse(fs.readFileSync(path.join(data, "sembr-chat.jsonl"), "utf8")),
  ).toMatchObject({ lines: 1, multi: 1 });
  const pre = run({
    hook_event_name: "PreToolUse",
    ...write("/w/a.md", FUSED),
  });
  expect(
    JSON.parse(pre.stdout.toString()).hookSpecificOutput.updatedInput.content,
  ).toBe(SPLIT);
  const other = run({
    hook_event_name: "PreToolUse",
    ...write("/w/a.mjs", FUSED),
  });
  expect(other.stdout.toString()).toBe("");
});

test("`hooks.json`: the rewrite is on `Write`, `Edit`, and `Bash`, the count is on `Stop`", () => {
  const hooks = JSON.parse(
    fs.readFileSync(
      path.join(
        import.meta.dirname,
        "../../plugins/dotclaude/hooks/hooks.json",
      ),
      "utf8",
    ),
  ).hooks;
  const cmd = 'node "${CLAUDE_PLUGIN_ROOT}/features/sembr/cli.mjs"';
  expect(
    hooks.PreToolUse.filter((g) => g.hooks.some((h) => h.command === cmd)).map(
      (g) => g.matcher,
    ),
  ).toEqual(["Bash", "Write|Edit"]);
  const bash = hooks.PreToolUse.find(
    (g) => g.matcher === "Bash" && g.hooks.some((h) => h.command === cmd),
  );
  expect(bash.hooks.map((h) => h.if)).toEqual([
    "Bash(git commit *)",
    "Bash(gh pr create *)",
  ]);
  expect(
    hooks.Stop.flatMap((g) => g.hooks).some((h) => h.command === cmd),
  ).toBe(true);
});
