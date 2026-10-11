// Behavior tests of the shared glue of the classic command hooks.
// An injected reader and writer replace stdin and stdout.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  postToolUse,
  preToolUse,
  runHook,
} from "../../../plugins/dotclaude/lib/hook-io.mjs";

/** Runs `decide` on the text `input` and gives the text that the hook wrote. `failed` collects the stderr text. */
function run(decide, input, failed = []) {
  const written = [];
  runHook(decide, {
    read: () => input,
    write: (t) => written.push(t),
    fail: (t) => failed.push(t),
  });
  return written;
}

test("a valid payload reaches decide and its output is printed as JSON", () => {
  const seen = [];
  const out = run((p) => {
    seen.push(p);
    return { ok: 1 };
  }, '{"tool_name":"Bash"}');
  assert.deepEqual(seen, [{ tool_name: "Bash" }]);
  assert.deepEqual(out, ['{"ok":1}']);
});

test("a payload that is not JSON prints nothing and does not call decide", () => {
  let called = false;
  const out = run(() => {
    called = true;
    return { ok: 1 };
  }, "{not json");
  assert.deepEqual(out, []);
  assert.equal(called, false);
});

test("a decide that returns undefined prints nothing", () => {
  assert.deepEqual(
    run(() => undefined, "{}"),
    [],
  );
});

test("a payload that is not JSON writes nothing to stderr", () => {
  const failed = [];
  run(() => ({ ok: 1 }), "{not json", failed);
  assert.deepEqual(failed, []);
});

test("a decide that throws prints nothing on stdout and reports the error on stderr", () => {
  const failed = [];
  const out = run(
    () => {
      throw new Error("rule broke");
    },
    "{}",
    failed,
  );
  assert.deepEqual(out, []);
  assert.equal(failed.length, 1);
  assert.match(failed[0], /rule broke/);
});

test("a decide that throws a `SyntaxError` is reported, because it is a defect and not a bad payload", () => {
  const failed = [];
  run(() => JSON.parse("{"), "{}", failed);
  assert.equal(failed.length, 1);
});

test("a reader that throws prints nothing on stdout and reports the error on stderr", () => {
  const written = [];
  const failed = [];
  runHook(() => ({ ok: 1 }), {
    read: () => {
      throw new Error("no stdin");
    },
    write: (t) => written.push(t),
    fail: (t) => failed.push(t),
  });
  assert.deepEqual(written, []);
  assert.match(failed.join(""), /no stdin/);
});

test("the `PreToolUse` builder keeps the given fields and leaves out the others", () => {
  assert.deepEqual(
    preToolUse({ permissionDecision: "deny", permissionDecisionReason: "r" }),
    {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "r",
      },
    },
  );
  const updated = preToolUse({ updatedInput: { command: "c" } });
  assert.deepEqual(Object.keys(updated.hookSpecificOutput), [
    "hookEventName",
    "updatedInput",
  ]);
});

test("the `PostToolUse` builder gives `additionalContext`", () => {
  assert.deepEqual(postToolUse({ additionalContext: "note" }), {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: "note",
    },
  });
});
