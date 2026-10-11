// The file checks of the `adherence` hooks (design D34): the ask for a test or limits file,
// and the approval claim. Files and transcripts are strings.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  approved,
  claims,
  prompts,
} from "../../../plugins/dotclaude/features/adherence/approval.mjs";
import { decide } from "../../../plugins/dotclaude/features/adherence/cli.mjs";
import { HOOK_TIMEOUT_S } from "../../../plugins/dotclaude/features/adherence/limits.mjs";
import { PLUGINS } from "../../support/repo.mjs";
import { filesByPath } from "./stub-fs.mjs";

const CWD = "/w";
/** The `io` of a test: `files` maps a path to its text, and `transcript` is the text of the transcript. */
const io = (files = {}, extra = {}) => ({
  ...filesByPath(files),
  transcript: () => null,
  ...extra,
});
const call = (tool_name, tool_input, extra = {}) => ({
  tool_name,
  cwd: CWD,
  ...extra,
  tool_input,
});
const out = (payload, i = io()) => decide(payload, {}, i)?.hookSpecificOutput;
const user = (content, extra = {}) =>
  JSON.stringify({
    type: "user",
    message: { role: "user", content },
    ...extra,
  });

test("a deny wins over an ask for the same call", () => {
  const file = "/w/tests/notes.md";
  const o = out(
    call("Write", { file_path: file, content: "see max_lines" }),
    io({ [file]: "old" }),
  );
  assert.equal(o.permissionDecision, "deny");
});

test("an approval claim with no approval word in the transcript is denied", () => {
  const transcript = [user("please fix the router"), user("thanks")].join("\n");
  const o = out(
    call(
      "Edit",
      {
        file_path: "/w/a.mjs",
        old_string: "a",
        new_string: "// decision of the user",
      },
      { transcript_path: "/t.jsonl" },
    ),
    io(
      { "/w/a.mjs": "a" },
      { transcript: () => ({ text: transcript, truncated: false }) },
    ),
  );
  assert.equal(o.permissionDecision, "deny");
  assert.equal(typeof o.permissionDecisionReason, "string");
});

test("an approval claim with an approval word in a prompt passes", () => {
  const transcript = [
    user("please fix the router"),
    user("yes, go ahead"),
  ].join("\n");
  const o = out(
    call(
      "Write",
      { file_path: "/w/a.mjs", content: "// approved by the user" },
      { transcript_path: "/t.jsonl" },
    ),
    io({}, { transcript: () => ({ text: transcript, truncated: false }) }),
  );
  assert.equal(o, undefined);
});

test("an approval claim fails open when the transcript is unreadable, cut, or absent", () => {
  const w = (extra) =>
    call(
      "Write",
      { file_path: "/w/a.mjs", content: "the user approved it" },
      extra,
    );
  assert.equal(out(w({ transcript_path: "/t.jsonl" })), undefined);
  assert.equal(out(w({})), undefined);
  const cut = io(
    {},
    { transcript: () => ({ text: user("hello"), truncated: true }) },
  );
  assert.equal(out(w({ transcript_path: "/t.jsonl" }), cut), undefined);
});

test("text that holds no claim never reads the transcript", () => {
  const spy = io(
    {},
    {
      transcript: () => {
        throw new Error("read");
      },
    },
  );
  const w = call(
    "Write",
    { file_path: "/w/a.mjs", content: "the user asked" },
    { transcript_path: "/t.jsonl" },
  );
  assert.equal(out(w, spy), undefined);
});

test("an old claim in the file is not a new claim", () => {
  const file = "// decision of the user\nconst a = 1;\n";
  const o = out(
    call(
      "Edit",
      {
        file_path: "/w/a.mjs",
        old_string: "const a = 1;",
        new_string: "const a = 2;",
      },
      { transcript_path: "/t.jsonl" },
    ),
    io(
      { "/w/a.mjs": file },
      { transcript: () => ({ text: user("hi"), truncated: false }) },
    ),
  );
  assert.equal(o, undefined);
});

test("the claim patterns match the usual forms and not plain words", () => {
  for (const t of [
    "(decision of the user 2026-10-09)",
    "Approved by the user",
    "the user approved the plan",
    "the user has decided",
    "user-approved bound",
  ])
    assert.deepEqual([t, claims(t).length > 0], [t, true]);
  for (const t of [
    "the user asked for it",
    "ask the user to approve",
    "a user decision tree",
  ])
    assert.deepEqual([t, claims(t)], [t, []]);
});

test("the prompts are the text records of the user, and not tool results or reminders", () => {
  const transcript = [
    user("first prompt"),
    user([{ type: "text", text: "second prompt" }]),
    user([{ type: "tool_result", content: "yes ok" }]),
    user("<system-reminder>yes</system-reminder>"),
    user("meta yes", { isMeta: true }),
    JSON.stringify({ type: "assistant", message: { content: "yes" } }),
    "not json",
  ].join("\n");
  assert.deepEqual(prompts(transcript), ["first prompt", "second prompt"]);
  assert.equal(approved(transcript), false);
  assert.equal(approved(user("ok")), true);
  assert.equal(approved(user("Do it please")), true);
  assert.equal(approved(user("a book")), false);
});

test("a read that throws reaches `runHook`, which fails open and reports it", () => {
  const boom = io(
    {},
    {
      read: () => {
        throw new Error("read");
      },
    },
  );
  const w = call("Write", {
    file_path: "/w/tests/a.test.mjs",
    content: "see max_lines",
  });
  assert.throws(() => decide(w, {}, boom), /read/);
});

test("the hook timeout in `hooks/hooks.json` equals `HOOK_TIMEOUT_S` for each `adherence` entry", () => {
  const file = path.join(PLUGINS, "dotclaude/hooks/hooks.json");
  const entries = Object.values(JSON.parse(fs.readFileSync(file, "utf8")).hooks)
    .flat()
    .flatMap((g) => g.hooks)
    .filter((h) => h.command?.includes("features/adherence/cli.mjs"));
  // The list is empty until the entries are added, and the test then pins them.
  for (const h of entries) assert.equal(h.timeout, HOOK_TIMEOUT_S);
});

test("the entry point prints the hook JSON for stdin, and nothing for bad input", () => {
  const cli = path.join(PLUGINS, "dotclaude/features/adherence/cli.mjs");
  const run = (input) => {
    const r = spawnSync(process.execPath, [cli], {
      input,
      encoding: "utf8",
      env: { ...process.env, CLAUDE_PROJECT_DIR: "/none" },
    });
    return { status: r.status, stdout: r.stdout };
  };
  const payload = call("Bash", { command: "git stash" });
  const ok = run(JSON.stringify(payload));
  assert.equal(
    JSON.parse(ok.stdout).hookSpecificOutput.permissionDecision,
    "ask",
  );
  assert.partialDeepStrictEqual(run("not json"), { status: 0, stdout: "" });
  assert.partialDeepStrictEqual(run(""), { status: 0, stdout: "" });
});
