// The time limit of the search hook of dotclaude-codegraph (design D26) with a FAKE `codegraph` that sleeps.
// The test has a file of its own, because on Windows it lasts as long as the sleep of the fake.

import assert from "node:assert/strict";
import { test } from "node:test";
import { QUERY_TIMEOUT_MS } from "../../plugins/dotclaude-codegraph/features/graph/limits.mjs";
import { grep, hit, runHook, setUp } from "./fake-cli.mjs";

test("a CLI that does not answer in time adds nothing and does not block", () => {
  const t = setUp();
  t.answer("query.out", [hit("parse_amount", "function", "shop/money.py", 4)]);
  const r = runHook("search", grep(t.project, "parse_amount"), {
    ...t.env,
    // One second more than the time limit of a query. On Windows the shell leaves the fake alive after the kill,
    // so the run lasts as long as the sleep, and the test must stay inside its own 5 second bound.
    FAKE_QUERY_SLEEP: String(QUERY_TIMEOUT_MS / 1000 + 1),
  });
  assert.equal(r.out, null);
  assert.equal(r.status, 0);
  // Without the time limit the run would wait for the fake and print the answer, so `out` would not be `null`.
});
