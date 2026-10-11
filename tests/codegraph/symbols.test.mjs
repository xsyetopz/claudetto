// The search hook of dotclaude-codegraph (design D26) with a FAKE `codegraph` on `PATH`:
// a known symbol, a pattern that is not one name, a prefix name, and an empty result.

import assert from "node:assert/strict";
import { test } from "node:test";
import { caller, grep, hit, runHook, setUp, text } from "./fake-cli.mjs";

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
