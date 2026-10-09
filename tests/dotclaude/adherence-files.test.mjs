// The file checks of the `adherence` hooks (design D34): the ask for a test or limits file,
// and the approval claim. Files and transcripts are strings.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  approved,
  claims,
  prompts,
} from "../../plugins/dotclaude/features/adherence/approval.mjs";
import { decide } from "../../plugins/dotclaude/features/adherence/cli.mjs";
import { HOOK_TIMEOUT_S } from "../../plugins/dotclaude/features/adherence/limits.mjs";

const CWD = "/w";
/** The `io` of a test: `files` maps a path to its text, and `transcript` is the text of the transcript. */
const io = (files = {}, extra = {}) => ({
  read: (f) => files[f] ?? null,
  exists: (f) => f in files,
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
  expect(o.permissionDecision).toBe("deny");
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
  expect(o.permissionDecision).toBe("deny");
  expect(o.permissionDecisionReason).toContain("decision of the user");
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
  expect(o).toBeUndefined();
});

test("an approval claim fails open when the transcript is unreadable, cut, or absent", () => {
  const w = (extra) =>
    call(
      "Write",
      { file_path: "/w/a.mjs", content: "the user approved it" },
      extra,
    );
  expect(out(w({ transcript_path: "/t.jsonl" }))).toBeUndefined();
  expect(out(w({}))).toBeUndefined();
  const cut = io(
    {},
    { transcript: () => ({ text: user("hello"), truncated: true }) },
  );
  expect(out(w({ transcript_path: "/t.jsonl" }), cut)).toBeUndefined();
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
  expect(out(w, spy)).toBeUndefined();
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
  expect(o).toBeUndefined();
});

test("the claim patterns match the usual forms and not plain words", () => {
  for (const t of [
    "(decision of the user 2026-10-09)",
    "Approved by the user",
    "the user approved the plan",
    "the user has decided",
    "user-approved bound",
  ])
    expect([t, claims(t).length > 0]).toEqual([t, true]);
  for (const t of [
    "the user asked for it",
    "ask the user to approve",
    "a user decision tree",
  ])
    expect([t, claims(t)]).toEqual([t, []]);
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
  expect(prompts(transcript)).toEqual(["first prompt", "second prompt"]);
  expect(approved(transcript)).toBe(false);
  expect(approved(user("ok"))).toBe(true);
  expect(approved(user("Do it please"))).toBe(true);
  expect(approved(user("a book"))).toBe(false);
});

test("a read that throws fails open", () => {
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
  expect(decide(w, {}, boom)).toBeUndefined();
});

test("the hook timeout in `hooks/hooks.json` equals `HOOK_TIMEOUT_S` for each `adherence` entry", () => {
  const file = path.join(
    import.meta.dirname,
    "../../plugins/dotclaude/hooks/hooks.json",
  );
  const entries = Object.values(JSON.parse(fs.readFileSync(file, "utf8")).hooks)
    .flat()
    .flatMap((g) => g.hooks)
    .filter((h) => h.command?.includes("features/adherence/cli.mjs"));
  // The list is empty until the entries are added, and the test then pins them.
  for (const h of entries) expect(h.timeout).toBe(HOOK_TIMEOUT_S);
});

test("the entry point prints the hook JSON for stdin, and nothing for bad input", () => {
  const cli = path.join(
    import.meta.dirname,
    "../../plugins/dotclaude/features/adherence/cli.mjs",
  );
  const run = (input) => {
    const r = Bun.spawnSync([Bun.which("node"), cli], {
      stdin: Buffer.from(input),
      env: { ...process.env, CLAUDE_PROJECT_DIR: "/none" },
    });
    return { status: r.exitCode, stdout: r.stdout.toString() };
  };
  const payload = call("Bash", { command: "git stash" });
  const ok = run(JSON.stringify(payload));
  expect(JSON.parse(ok.stdout).hookSpecificOutput.permissionDecision).toBe(
    "ask",
  );
  expect(run("not json")).toMatchObject({ status: 0, stdout: "" });
  expect(run("")).toMatchObject({ status: 0, stdout: "" });
});
