// The search hook of dotclaude-codegraph (design D26) with a FAKE `codegraph` on `PATH`:
// a callers answer that is text, an answer that is not JSON, a long list, and a `Glob` pattern.

import assert from "node:assert/strict";
import { test } from "node:test";
import { GRAPH_CONTEXT_MAX } from "../../plugins/dotclaude-codegraph/features/graph/limits.mjs";
import { caller, grep, hit, runHook, setUp, text } from "./fake-cli.mjs";

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
  const named = text(runHook("search", glob("**/Cart*.py"), t.env));
  assert.ok(named.includes("`Cart`"), named);
  const before = t.log().length;
  for (const pattern of ["**/*.py", "src/**/*.{ts,tsx}"])
    runHook("search", glob(pattern), t.env);
  for (const pattern of ["parse|format", "def .*cart", "ab", "a.b"])
    runHook("search", grep(t.project, pattern), t.env);
  assert.equal(t.log().length, before);
});
