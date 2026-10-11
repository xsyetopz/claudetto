// Error policy of the `dotclaude` plugin: a `catch` handles the error that it expects and passes the others on.
// An expected error is an absent file or a line that is not JSON.
// An unexpected error is a symbolic link that points to itself (`ELOOP`), which the tests make in a folder under `TMPDIR`.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { stripVTControlCharacters } from "node:util";
import { prompts } from "../../plugins/dotclaude/features/adherence/approval.mjs";
import {
  readText,
  readTranscript,
} from "../../plugins/dotclaude/features/adherence/cli.mjs";
import { tailRows } from "../../plugins/dotclaude/features/context/cli.mjs";
import {
  allRows,
  maxTurnsOf,
} from "../../plugins/dotclaude/features/context/turns.mjs";
import { decide as decideReads } from "../../plugins/dotclaude/features/reads/cli.mjs";
import { readTable } from "../../plugins/dotclaude/features/statusline/context-table.mjs";
import { readUsage } from "../../plugins/dotclaude/features/statusline/credits.mjs";
import { parseInput } from "../../plugins/dotclaude/features/statusline/input.mjs";
import { openspecChange } from "../../plugins/dotclaude/features/statusline/openspec.mjs";
import {
  isExpected,
  rethrowUnless,
} from "../../plugins/dotclaude/lib/errors.mjs";
import { PLUGINS, tmpDir } from "../support/repo.mjs";

const dir = tmpDir("dc-errors");
const absent = path.join(dir, "absent.jsonl");
const loop = path.join(dir, "loop");
fs.symlinkSync(loop, loop);

test("`rethrowUnless` returns for a listed code or name and throws the rest", () => {
  rethrowUnless(Object.assign(new Error("x"), { code: "ENOENT" }), "ENOENT");
  rethrowUnless(new SyntaxError("x"), "SyntaxError");
  const other = new TypeError("x");
  assert.throws(() => rethrowUnless(other, "ENOENT", "SyntaxError"), other);
  assert.equal(isExpected(undefined, "ENOENT"), false);
});

test("the adherence reads give null for an absent file and throw any other error", () => {
  assert.equal(readText(absent), null);
  assert.equal(readTranscript(absent), null);
  assert.throws(() => readText(loop), { code: "ELOOP" });
  assert.throws(() => readTranscript(loop), { code: "ELOOP" });
});

test("a line that is not JSON in a transcript is skipped by the approval check", () => {
  const rows = [
    "{cut",
    JSON.stringify({ type: "user", message: { content: "yes, go on" } }),
  ];
  assert.deepEqual(prompts(rows.join("\n")), ["yes, go on"]);
});

test("the turn count and the tail read give no rows for an absent transcript and throw any other error", () => {
  assert.deepEqual(allRows(absent), []);
  assert.deepEqual(tailRows(absent), []);
  assert.throws(() => allRows(loop), { code: "ELOOP" });
  assert.throws(() => tailRows(loop), { code: "ELOOP" });
});

test("cut lines are skipped when the rows are read", () => {
  const file = path.join(dir, "rows.jsonl");
  fs.writeFileSync(file, 'ial"}\n{"type":"assistant"}\n');
  assert.deepEqual(allRows(file), [{ type: "assistant" }]);
  assert.deepEqual(tailRows(file), [{ type: "assistant" }]);
});

test("`maxTurnsOf` gives undefined for an absent agent file and throws any other error", () => {
  assert.equal(maxTurnsOf("nobody", dir), undefined);
  fs.symlinkSync(
    path.join(dir, "agent-loop.md"),
    path.join(dir, "agent-loop.md"),
  );
  assert.throws(() => maxTurnsOf("agent-loop", dir), { code: "ELOOP" });
});

test("the print check allows a file that is absent and throws for any other read error", () => {
  const cat = (file) => ({
    tool_name: "Bash",
    cwd: dir,
    // The name is relative to `cwd`. A Windows path has backslashes and a short name with `~`, and the rule reads both as not simple.
    tool_input: { command: `tail -n 5 ${path.basename(file)}` },
  });
  assert.equal(decideReads(cat(absent)), undefined);
  assert.throws(() => decideReads(cat(loop)), { code: "ELOOP" });
});

test("`readUsage` gives no usage for an absent file, text that is not JSON, or a cache of another shape", () => {
  const none = { credits: null, fable: null };
  const home = (text) => {
    const config = fs.mkdtempSync(path.join(dir, "config-"));
    if (text !== undefined)
      fs.writeFileSync(path.join(config, ".claude.json"), text);
    return { CLAUDE_CONFIG_DIR: config };
  };
  assert.deepEqual(readUsage(home(), 1), none);
  assert.deepEqual(readUsage(home("{"), 1), none);
  assert.deepEqual(readUsage(home("{}"), 1), none);
  assert.deepEqual(
    readUsage(home('{"cachedUsageUtilization":{"fetchedAtMs":1}}'), 1),
    none,
  );
});

test("`readUsage` throws a read error that is not an absent file", () => {
  const config = fs.mkdtempSync(path.join(dir, "config-"));
  fs.symlinkSync(
    path.join(config, ".claude.json"),
    path.join(config, ".claude.json"),
  );
  assert.throws(() => readUsage({ CLAUDE_CONFIG_DIR: config }, 1), {
    code: "ELOOP",
  });
});

test("`openspecChange` gives null for a project with no changes folder and throws any other error", () => {
  assert.equal(openspecChange(path.join(dir, "no-project")), null);
  const project = fs.mkdtempSync(path.join(dir, "project-"));
  fs.mkdirSync(path.join(project, "openspec"));
  fs.symlinkSync(
    path.join(project, "openspec", "changes"),
    path.join(project, "openspec", "changes"),
  );
  assert.throws(() => openspecChange(project), { code: "ELOOP" });
});

test("`readTable` gives null for an absent transcript and throws any other error", () => {
  assert.equal(readTable({ transcript_path: absent }), null);
  assert.throws(() => readTable({ transcript_path: loop }), { code: "ELOOP" });
});

test("`parseInput` gives null for text that is not JSON", () => {
  assert.equal(parseInput("{"), null);
  assert.deepEqual(parseInput("[]"), {});
});

test("the status line writes an unexpected error to stderr and still prints one row", () => {
  const script = path.join(PLUGINS, "dotclaude/features/statusline/cli.mjs");
  const run = (input) =>
    spawnSync(process.execPath, [script], {
      encoding: "utf8",
      input: JSON.stringify(input),
      cwd: dir,
      env: { ...process.env, CLAUDE_CONFIG_DIR: dir, COLUMNS: "120" },
    });
  const bad = run({ transcript_path: loop });
  assert.equal(bad.status, 0);
  assert.match(bad.stderr, /ELOOP/);
  assert.equal(stripVTControlCharacters(bad.stdout).trim(), "");
  const fine = run({ transcript_path: absent });
  assert.equal(fine.stderr, "");
});
