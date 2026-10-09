// The command hooks of dotclaude-codegraph (design D26) with a FAKE `codegraph` on `PATH`.
// Scenarios: no index, a known symbol, an empty result, a timeout, and the background sync.

import { expect, test } from "bun:test";
import fs from "node:fs";
import { GRAPH_CONTEXT_MAX } from "../../plugins/dotclaude-codegraph/features/graph/limits.mjs";
import { caller, hit, runHook, setUp } from "./fake-cli.mjs";

const grep = (project, pattern) => ({
  cwd: project,
  tool_name: "Grep",
  tool_input: { pattern },
});
const text = (result) => result.out.hookSpecificOutput.additionalContext;

test("a project with no index: no hook runs a command or adds text", () => {
  const t = setUp({ index: false });
  const payload = grep(t.project, "parse_amount");
  expect(runHook("session-start", payload, t.env).out).toBeNull();
  expect(runHook("search", payload, t.env).out).toBeNull();
  expect(runHook("sync", payload, t.env).out).toBeNull();
  expect(t.log()).toEqual([]);
});

test("session start in an indexed project syncs and adds one line with callers, callees, and impact", () => {
  const t = setUp();
  const r = runHook("session-start", { cwd: t.project }, t.env);
  expect(t.log()).toEqual(["sync -q"]);
  expect(r.out.hookSpecificOutput.hookEventName).toBe("SessionStart");
  const line = text(r);
  expect(line).not.toContain("\n");
  for (const word of ["callers", "callees", "impact", "-d 5"])
    expect(line).toContain(word);
});

test("session start with the CLI missing adds nothing", () => {
  const t = setUp({ installed: false });
  expect(runHook("session-start", { cwd: t.project }, t.env).out).toBeNull();
});

test("a known symbol gets its definition and callers, and the pattern follows --", () => {
  const t = setUp();
  t.answer("query.out", [
    hit("parse_amount.py", "file", "shop/money.py", 1, 9),
    hit("parse_amount", "function", "shop/money.py", 4),
  ]);
  t.answer("callers.out", {
    callers: [
      caller("add", "shop/cart.py", 8, "method"),
      caller("cart.py", "shop/cart.py", 1, "file"),
      caller("load_prices", "shop/import_csv.py", 4),
    ],
  });
  const r = runHook("search", grep(t.project, "parse_amount"), t.env);
  const hook = r.out.hookSpecificOutput;
  expect(hook.hookEventName).toBe("PreToolUse");
  expect(hook.permissionDecision).toBeUndefined();
  expect(r.status).toBe(0);
  expect(hook.additionalContext).toContain(
    "`parse_amount`, a function at `shop/money.py:4`",
  );
  expect(hook.additionalContext).toContain("`add` (`shop/cart.py:8`)");
  expect(hook.additionalContext).toContain("`load_prices`");
  expect(hook.additionalContext).not.toContain("cart.py:1");
  expect(t.log()[0]).toBe("query -j -l 10 -- parse_amount");
  expect(t.log()[1]).toBe("callers -j -l 10 -- parse_amount");
});

test("a pattern that is not one name calls nothing", () => {
  const t = setUp();
  t.answer("query.out", []);
  runHook("search", grep(t.project, "-foo"), t.env);
  runHook("search", grep(t.project, "foo-bar"), t.env);
  expect(t.log()).toEqual([]);
});

test("a prefix name matches, and an exact name wins", () => {
  const t = setUp();
  t.answer("query.out", [
    hit("parse_amounts", "function", "a.py", 1),
    hit("parse_amount", "function", "b.py", 2),
  ]);
  t.answer("callers.out", { callers: [] });
  const exact = runHook("search", grep(t.project, "parse_amount"), t.env);
  expect(text(exact)).toContain("`b.py:2`");
  expect(text(exact)).toContain("no callers");
  const prefix = runHook("search", grep(t.project, "parse_amo"), t.env);
  expect(text(prefix)).toContain("`parse_amounts`");
});

test("an empty result, or only file and import hits, add nothing", () => {
  const t = setUp();
  t.answer("query.out", []);
  expect(
    runHook("search", grep(t.project, "nothing_here"), t.env).out,
  ).toBeNull();
  t.answer("query.out", [
    hit("nothing_here.py", "file", "nothing_here.py", 1),
    hit("nothing_here", "import", "a.py", 1),
    hit("other_name", "function", "a.py", 3),
  ]);
  expect(
    runHook("search", grep(t.project, "nothing_here"), t.env).out,
  ).toBeNull();
});

test("a callers answer that is text gives the definition and no claim about callers", () => {
  const t = setUp();
  t.answer("query.out", [hit("parse_amount", "function", "shop/money.py", 4)]);
  t.answer("callers.out", 'ℹ Symbol "parse_amount" not found');
  const r = runHook("search", grep(t.project, "parse_amount"), t.env);
  expect(text(r)).toContain("`parse_amount`");
  expect(text(r)).not.toContain("callers in the graph");
  expect(text(r)).not.toContain("Callers:");
});

test("a query answer that is not JSON adds nothing", () => {
  const t = setUp();
  t.answer("query.out", "not json");
  expect(
    runHook("search", grep(t.project, "parse_amount"), t.env).out,
  ).toBeNull();
});

test("a long list of callers stays within GRAPH_CONTEXT_MAX and counts the rest", () => {
  const t = setUp();
  t.answer("query.out", [hit("parse_amount", "function", "shop/money.py", 4)]);
  t.answer("callers.out", {
    callers: Array.from({ length: 40 }, (_, i) =>
      caller(`caller_function_${i}`, `src/module_${i}/file.py`, i + 1),
    ),
  });
  const r = runHook("search", grep(t.project, "parse_amount"), t.env);
  expect(text(r).length).toBeLessThanOrEqual(GRAPH_CONTEXT_MAX);
  expect(text(r)).toMatch(/and \d+ more\./);
  expect(text(r)).toContain("`caller_function_0`");
});

test("a Glob pattern with a name searches that name, and other patterns call nothing", () => {
  const t = setUp();
  t.answer("query.out", [hit("Cart", "class", "shop/cart.py", 5)]);
  t.answer("callers.out", { callers: [] });
  const glob = (pattern) => ({
    cwd: t.project,
    tool_name: "Glob",
    tool_input: { pattern },
  });
  expect(text(runHook("search", glob("**/Cart*.py"), t.env))).toContain(
    "`Cart`",
  );
  const before = t.log().length;
  for (const pattern of ["**/*.py", "src/**/*.{ts,tsx}"])
    runHook("search", glob(pattern), t.env);
  for (const pattern of ["parse|format", "def .*cart", "ab", "a.b"])
    runHook("search", grep(t.project, pattern), t.env);
  expect(t.log().length).toBe(before);
});

test("a CLI that does not answer in time adds nothing and does not block", () => {
  const t = setUp();
  t.answer("query.out", [hit("parse_amount", "function", "shop/money.py", 4)]);
  const r = runHook("search", grep(t.project, "parse_amount"), {
    ...t.env,
    FAKE_QUERY_SLEEP: "5",
  });
  expect(r.out).toBeNull();
  expect(r.status).toBe(0);
  expect(r.ms).toBeLessThan(4500);
});

test("a missing CLI adds nothing to a search", () => {
  const t = setUp({ installed: false });
  expect(
    runHook("search", grep(t.project, "parse_amount"), t.env).out,
  ).toBeNull();
});

test("the sync mode runs codegraph sync -q and prints nothing", () => {
  const t = setUp();
  const r = runHook("sync", { cwd: t.project, tool_name: "Edit" }, t.env);
  expect(r.out).toBeNull();
  expect(r.status).toBe(0);
  expect(t.log()).toEqual(["sync -q"]);
});

test("the project folder comes from CLAUDE_PROJECT_DIR before the payload cwd", () => {
  const t = setUp();
  const r = runHook(
    "session-start",
    { cwd: "/nonexistent" },
    { ...t.env, CLAUDE_PROJECT_DIR: t.project },
  );
  expect(r.out).not.toBeNull();
});

test("a home folder with .codegraph/ and no database is not an index", () => {
  const t = setUp({ index: false });
  fs.mkdirSync(`${t.project}/.codegraph`);
  fs.writeFileSync(`${t.project}/.codegraph/telemetry-queue.jsonl`, "");
  expect(runHook("session-start", { cwd: t.project }, t.env).out).toBeNull();
  expect(t.log()).toEqual([]);
});
