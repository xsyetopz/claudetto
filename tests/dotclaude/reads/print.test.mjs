// The file-print deny (spec context-bound, design D22) with commands as strings.
// No command runs. `count` is a stub for the line count of the named file, and no file is read.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { decide } from "../../../plugins/dotclaude/features/reads/cli.mjs";
import { PLUGINS } from "../../support/repo.mjs";

const CWD = "/work/app";
const FILE = "/work/app/docs/design.md";
const run = (command, count = () => 100) =>
  decide({ tool_name: "Bash", cwd: CWD, tool_input: { command } }, count);
const reason = (command, count) =>
  run(command, count)?.hookSpecificOutput.permissionDecisionReason;
/** The `Read` arguments that the reason of the print rule carries. */
const readArgs = (command, count) => {
  const text = reason(command, count);
  const num = (key) => {
    const m = new RegExp(`\`${key}\` (\\d+)`).exec(text);
    return m ? Number(m[1]) : undefined;
  };
  return {
    file: /`file_path` `([^`]+)`/.exec(text)?.[1],
    offset: num("offset"),
    limit: num("limit"),
  };
};

test("`cat F` is denied with the absolute path and no range", () => {
  const out = run("cat docs/design.md");
  assert.equal(out.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
  assert.deepEqual(readArgs("cat docs/design.md"), {
    file: FILE,
    limit: undefined,
    offset: undefined,
  });
});

test("`sed -n 'a,bp' F` names `Read` with `offset a` and `limit b-a+1`", () => {
  assert.deepEqual(readArgs("sed -n '40,80p' docs/design.md"), {
    file: FILE,
    offset: 40,
    limit: 41,
  });
  assert.partialDeepStrictEqual(readArgs('sed -n "7p" docs/design.md'), {
    offset: 7,
    limit: 1,
  });
});

test("`head F`, `head -n N F`, and `head -N F` name `Read` from line 1", () => {
  const from1 = (limit) => ({ file: FILE, offset: 1, limit });
  assert.deepEqual(readArgs("head docs/design.md"), from1(10));
  assert.deepEqual(readArgs("head -n 30 docs/design.md"), from1(30));
  assert.deepEqual(readArgs("head -5 docs/design.md"), from1(5));
});

test("`tail F` names `Read` at the last lines, from the line count", () => {
  assert.partialDeepStrictEqual(readArgs("tail docs/design.md"), {
    offset: 91,
    limit: 10,
  });
  assert.equal(readArgs("tail -n 20 docs/design.md").offset, 81);
  assert.partialDeepStrictEqual(readArgs("tail -n 500 docs/design.md"), {
    offset: 1,
    limit: 100,
  });
  assert.equal(readArgs("tail -n +50 docs/design.md").offset, 50);
});

test("a bounded pipe, a redirect, and a range in a list stay allowed", () => {
  for (const command of [
    "grep -n D22 docs/design.md | head -5",
    "cat docs/design.md > copy.md",
    "sed -n '1,5p' docs/design.md; ls",
  ])
    assert.equal(run(command), undefined);
});

test("a print in a pipe, a list, or a substitution stays allowed, because `bashOutputMaxChars` bounds the output", () => {
  for (const command of [
    "cat docs/design.md | grep D22",
    "cat docs/design.md && echo done",
    "cat $(ls docs)",
    "cat docs/design.md\nls",
  ])
    assert.equal(run(command), undefined);
});

test("a command with an edit, a byte count, or another bounded form stays allowed", () => {
  for (const command of [
    "sed -i 's/a/b/' docs/design.md",
    "head -c 2000 docs/design.md",
    "tail -f docs/design.md",
    "head -n -3 docs/design.md",
    "ls docs",
    "git log -n 5",
  ])
    assert.equal(run(command), undefined);
});

test("more than one file, an option, a pattern print, and `git log` stay allowed", () => {
  for (const command of [
    "cat a.md b.md",
    "cat -n docs/design.md",
    "sed -n '/x/p' docs/design.md",
    "git log",
  ])
    assert.equal(run(command), undefined);
});

test("a generated file gets no `Read` call", () => {
  assert.equal(run("tail -n 50 run.log"), undefined);
  for (const command of [
    "cat node_modules/p/index.js",
    "cat bun.lock",
    "cat dist/app.min.js",
  ])
    assert.equal(run(command), undefined);
});

test("a file in a temp folder is denied, because a project can be in a temp folder", () => {
  for (const command of ["head /tmp/out.txt", "cat /private/tmp/p/notes.txt"])
    assert.notEqual(run(command), undefined);
});

test("a file that does not exist or has no lines stays allowed", () => {
  assert.equal(
    run("cat missing.md", () => null),
    undefined,
  );
  assert.equal(
    run("tail missing.md", () => null),
    undefined,
  );
  assert.equal(
    run("tail empty.md", () => 0),
    undefined,
  );
});

test("a tool other than `Bash`, and a payload with no command, give no output", () => {
  assert.equal(
    decide({ tool_name: "Read", cwd: CWD, tool_input: { command: "cat a" } }),
    undefined,
  );
  assert.equal(
    decide({ tool_name: "Bash", cwd: CWD, tool_input: {} }),
    undefined,
  );
  assert.equal(decide(undefined), undefined);
});

test("`hooks.json` starts the script for each `Bash` call", () => {
  const hooks = JSON.parse(
    fs.readFileSync(path.join(PLUGINS, "dotclaude/hooks/hooks.json"), "utf8"),
  ).hooks;
  const group = hooks.PreToolUse.find((g) =>
    g.hooks.some((h) => h.command.includes("features/reads/cli.mjs")),
  );
  assert.equal(group.matcher, "Bash");
  assert.deepEqual(
    group.hooks.map((h) => h.if),
    [undefined],
  );
});
