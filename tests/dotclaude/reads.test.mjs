// The file-print deny (spec context-bound, design D22) with commands as strings.
// No command runs. `count` is a stub for the line count of the named file, and no file is read.

import { expect, test } from "bun:test";
import fs from "node:fs";
import { decide } from "../../plugins/dotclaude/features/reads/cli.mjs";

const CWD = "/work/app";
const FILE = "/work/app/docs/design.md";
const run = (command, count = () => 100) =>
  decide({ tool_name: "Bash", cwd: CWD, tool_input: { command } }, count);
const reason = (command, count) =>
  run(command, count)?.hookSpecificOutput.permissionDecisionReason;
/** The `Read` arguments that the reason of the print rule carries, or `{}` for the bound reason. */
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
  expect(out.hookSpecificOutput.hookEventName).toBe("PreToolUse");
  expect(out.hookSpecificOutput.permissionDecision).toBe("deny");
  expect(readArgs("cat docs/design.md")).toEqual({ file: FILE });
});

test("`sed -n 'a,bp' F` names `Read` with `offset a` and `limit b-a+1`", () => {
  expect(readArgs("sed -n '40,80p' docs/design.md")).toEqual({
    file: FILE,
    offset: 40,
    limit: 41,
  });
  expect(readArgs('sed -n "7p" docs/design.md')).toMatchObject({
    offset: 7,
    limit: 1,
  });
});

test("`head F`, `head -n N F`, and `head -N F` name `Read` from line 1", () => {
  const from1 = (limit) => ({ file: FILE, offset: 1, limit });
  expect(readArgs("head docs/design.md")).toEqual(from1(10));
  expect(readArgs("head -n 30 docs/design.md")).toEqual(from1(30));
  expect(readArgs("head -5 docs/design.md")).toEqual(from1(5));
});

test("`tail F` names `Read` at the last lines, from the line count", () => {
  expect(readArgs("tail docs/design.md")).toMatchObject({
    offset: 91,
    limit: 10,
  });
  expect(readArgs("tail -n 20 docs/design.md").offset).toBe(81);
  expect(readArgs("tail -n 500 docs/design.md")).toMatchObject({
    offset: 1,
    limit: 100,
  });
  expect(readArgs("tail -n +50 docs/design.md").offset).toBe(50);
});

test("a bounded pipe, a redirect, and a range in a list stay allowed", () => {
  for (const command of [
    "grep -n D22 docs/design.md | head -5",
    "cat docs/design.md > copy.md",
    "sed -n '1,5p' docs/design.md; ls",
  ])
    expect(run(command)).toBeUndefined();
});

// The bound rule (task 18.14) denies these, with the bounded form and not the `Read` call of the print rule.
test("a print in a pipe, a list, or a substitution gets the bound reason", () => {
  for (const command of [
    "cat docs/design.md | grep D22",
    "cat docs/design.md && echo done",
    "cat $(ls docs)",
    "cat docs/design.md\nls",
  ]) {
    expect(run(command).hookSpecificOutput.permissionDecision).toBe("deny");
    expect(readArgs(command).file).toBeUndefined();
  }
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
    expect(run(command)).toBeUndefined();
});

test("more than one file, an option, a pattern print, and `git log` get the bound reason", () => {
  for (const command of [
    "cat a.md b.md",
    "cat -n docs/design.md",
    "sed -n '/x/p' docs/design.md",
    "git log",
  ])
    expect(run(command).hookSpecificOutput.permissionDecision).toBe("deny");
});

test("a generated file gets no `Read` call, and only a print with no limit is denied", () => {
  expect(run("tail -n 50 run.log")).toBeUndefined();
  for (const command of [
    "cat node_modules/p/index.js",
    "cat bun.lock",
    "cat dist/app.min.js",
  ]) {
    expect(run(command).hookSpecificOutput.permissionDecision).toBe("deny");
    expect(readArgs(command).file).toBeUndefined();
  }
});

test("a file in a temp folder is denied, because a project can be in a temp folder", () => {
  for (const command of ["head /tmp/out.txt", "cat /private/tmp/p/notes.txt"])
    expect(run(command)).toBeDefined();
});

test("a file that does not exist or has no lines stays allowed", () => {
  expect(run("cat missing.md", () => null)).toBeUndefined();
  expect(run("tail missing.md", () => null)).toBeUndefined();
  expect(run("tail empty.md", () => 0)).toBeUndefined();
});

test("a tool other than `Bash`, and a payload with no command, give no output", () => {
  expect(
    decide({ tool_name: "Read", cwd: CWD, tool_input: { command: "cat a" } }),
  ).toBeUndefined();
  expect(
    decide({ tool_name: "Bash", cwd: CWD, tool_input: {} }),
  ).toBeUndefined();
  expect(decide(undefined)).toBeUndefined();
});

test("`hooks.json` starts the script for each `Bash` call", () => {
  const hooks = JSON.parse(
    fs.readFileSync(
      `${import.meta.dirname}/../../plugins/dotclaude/hooks/hooks.json`,
      "utf8",
    ),
  ).hooks;
  const group = hooks.PreToolUse.find((g) =>
    g.hooks.some((h) => h.command.includes("features/reads/cli.mjs")),
  );
  expect(group.matcher).toBe("Bash");
  expect(group.hooks.map((h) => h.if)).toEqual([undefined]);
});
