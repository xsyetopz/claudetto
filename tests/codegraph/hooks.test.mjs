// The command hooks of dotclaude-codegraph (design D26) with a FAKE `codegraph` on `PATH`.
// Scenarios: no index, a known symbol, an empty result, a timeout, and the background sync.

import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
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
  assert.equal(runHook("session-start", payload, t.env).out, null);
  assert.equal(runHook("search", payload, t.env).out, null);
  assert.equal(runHook("sync", payload, t.env).out, null);
  assert.deepEqual(t.log(), []);
});

test("session start in an indexed project syncs and adds one line with the commands for callers, callees, and impact", () => {
  const t = setUp();
  const r = runHook("session-start", { cwd: t.project }, t.env);
  assert.deepEqual(t.log(), ["sync -q"]);
  assert.equal(r.out.hookSpecificOutput.hookEventName, "SessionStart");
  const line = text(r);
  assert.ok(!line.includes("\n"), line);
  for (const command of [
    "codegraph callers",
    "codegraph callees",
    "codegraph impact",
    "-d 5",
  ])
    assert.ok(line.includes(command), line);
});

test("session start with the CLI missing adds nothing", () => {
  const t = setUp({ installed: false });
  assert.equal(runHook("session-start", { cwd: t.project }, t.env).out, null);
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
  assert.equal(hook.hookEventName, "PreToolUse");
  assert.equal(hook.permissionDecision, undefined);
  assert.equal(r.status, 0);
  assert.ok(
    hook.additionalContext.includes(
      "`parse_amount`, a function at `shop/money.py:4`",
    ),
    hook.additionalContext,
  );
  assert.ok(
    hook.additionalContext.includes("`add` (`shop/cart.py:8`)"),
    hook.additionalContext,
  );
  assert.ok(
    hook.additionalContext.includes("`load_prices`"),
    hook.additionalContext,
  );
  assert.ok(
    !hook.additionalContext.includes("cart.py:1"),
    hook.additionalContext,
  );
  assert.equal(t.log()[0], "query -j -l 10 -- parse_amount");
  assert.equal(t.log()[1], "callers -j -l 10 -- parse_amount");
});

test("a pattern that is not one name calls nothing", () => {
  const t = setUp();
  t.answer("query.out", []);
  runHook("search", grep(t.project, "-foo"), t.env);
  runHook("search", grep(t.project, "foo-bar"), t.env);
  assert.deepEqual(t.log(), []);
});

test("a prefix name matches, and an exact name wins", () => {
  const t = setUp();
  t.answer("query.out", [
    hit("parse_amounts", "function", "a.py", 1),
    hit("parse_amount", "function", "b.py", 2),
  ]);
  t.answer("callers.out", { callers: [] });
  const exact = runHook("search", grep(t.project, "parse_amount"), t.env);
  assert.ok(text(exact).includes("`b.py:2`"), text(exact));
  assert.ok(!text(exact).includes("a.py"), text(exact));
  const prefix = runHook("search", grep(t.project, "parse_amo"), t.env);
  assert.ok(text(prefix).includes("`parse_amounts`"), text(prefix));
});

test("an empty result, or only file and import hits, add nothing", () => {
  const t = setUp();
  t.answer("query.out", []);
  assert.equal(
    runHook("search", grep(t.project, "nothing_here"), t.env).out,
    null,
  );
  t.answer("query.out", [
    hit("nothing_here.py", "file", "nothing_here.py", 1),
    hit("nothing_here", "import", "a.py", 1),
    hit("other_name", "function", "a.py", 3),
  ]);
  assert.equal(
    runHook("search", grep(t.project, "nothing_here"), t.env).out,
    null,
  );
});

test("a callers answer that is text gives the definition and no claim about callers", () => {
  const t = setUp();
  t.answer("query.out", [hit("parse_amount", "function", "shop/money.py", 4)]);
  t.answer("callers.out", 'ℹ Symbol "parse_amount" not found');
  const r = runHook("search", grep(t.project, "parse_amount"), t.env);
  assert.ok(text(r).includes("`parse_amount`"), text(r));
  assert.ok(text(r).includes("`shop/money.py:4`"), text(r));
});

test("a query answer that is not JSON adds nothing", () => {
  const t = setUp();
  t.answer("query.out", "not json");
  assert.equal(
    runHook("search", grep(t.project, "parse_amount"), t.env).out,
    null,
  );
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
  assert.ok(text(r).length <= GRAPH_CONTEXT_MAX, `${text(r).length}`);
  assert.ok(text(r).includes("`caller_function_0`"), text(r));
  assert.ok(!text(r).includes("caller_function_39"), text(r));
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
  assert.ok(
    text(runHook("search", glob("**/Cart*.py"), t.env)).includes("`Cart`"),
    text(runHook("search", glob("**/Cart*.py"), t.env)),
  );
  const before = t.log().length;
  for (const pattern of ["**/*.py", "src/**/*.{ts,tsx}"])
    runHook("search", glob(pattern), t.env);
  for (const pattern of ["parse|format", "def .*cart", "ab", "a.b"])
    runHook("search", grep(t.project, pattern), t.env);
  assert.equal(t.log().length, before);
});

test("a CLI that does not answer in time adds nothing and does not block", () => {
  const t = setUp();
  t.answer("query.out", [hit("parse_amount", "function", "shop/money.py", 4)]);
  const r = runHook("search", grep(t.project, "parse_amount"), {
    ...t.env,
    FAKE_QUERY_SLEEP: "5",
  });
  assert.equal(r.out, null);
  assert.equal(r.status, 0);
  // Without the time limit the run would wait for the fake and print the answer, so `out` would not be `null`.
});

test("a missing CLI adds nothing to a search", () => {
  const t = setUp({ installed: false });
  assert.equal(
    runHook("search", grep(t.project, "parse_amount"), t.env).out,
    null,
  );
});

test("the sync mode runs codegraph sync -q and prints nothing", () => {
  const t = setUp();
  const r = runHook("sync", { cwd: t.project, tool_name: "Edit" }, t.env);
  assert.equal(r.out, null);
  assert.equal(r.status, 0);
  assert.deepEqual(t.log(), ["sync -q"]);
});

test("the project folder comes from CLAUDE_PROJECT_DIR before the payload cwd", () => {
  const t = setUp();
  const r = runHook(
    "session-start",
    { cwd: "/nonexistent" },
    { ...t.env, CLAUDE_PROJECT_DIR: t.project },
  );
  assert.notEqual(r.out, null);
});

test("a home folder with .codegraph/ and no database is not an index", () => {
  const t = setUp({ index: false });
  fs.mkdirSync(`${t.project}/.codegraph`);
  fs.writeFileSync(`${t.project}/.codegraph/telemetry-queue.jsonl`, "");
  assert.equal(runHook("session-start", { cwd: t.project }, t.env).out, null);
  assert.deepEqual(t.log(), []);
});
