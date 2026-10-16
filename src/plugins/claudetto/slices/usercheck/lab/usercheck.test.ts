// Lab tests of the `usercheck` slice: after a denied call, a reply with no `!` command gets one block.
// Each test has its own session id, because the hooks module keeps the denied calls by session.
// The file is self-contained, because `just generate` copies it to `tests/` of the plugin, where it cannot import a relative file.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

/** The engine answers of the two classic events, below the hooks under test. */
const engine = (on: On) => {
  on("classic.PermissionDenied", () => ({}));
  on("classic.Stop", () => ({}));
};

const deny = ($: Engine, session: string, command: string) =>
  $.classic.PermissionDenied({
    session_id: session,
    tool_name: "Bash",
    tool_input: { command },
    tool_use_id: "toolu_1",
    reason: "auto mode denied the call",
  });

const stop = ($: Engine, session: string, reply: string, active = false) =>
  $.classic.Stop({
    session_id: session,
    stop_hook_active: active,
    last_assistant_message: reply,
  });

test("with no denied call, the stop passes", async ($: Engine, on: On) => {
  engine(on);
  const out = await stop($, "s-none", "The work is done.");
  expect(out.block).toBeUndefined();
});

// biome-ignore lint/plugin: a test name that a `slice.ts` file references
test("after a denied call, a reply with no `!` command gets one block that names the call", async ($: Engine, on: On) => {
  engine(on);
  await deny($, "s-block", "just sandbox");
  const out = await stop($, "s-block", "Praca jest gotowa.");
  expect(out.block).toContain("`just sandbox`");
  expect(out.block).toContain("`!`");
});

test("after a denied call, a reply with a `!` command passes", async ($: Engine, on: On) => {
  engine(on);
  await deny($, "s-code", "just sandbox");
  const out = await stop(
    $,
    "s-code",
    "実行してください: `! just sandbox > /tmp/out.txt 2>&1`",
  );
  expect(out.block).toBeUndefined();
});

// biome-ignore lint/plugin: a test name that a `slice.ts` file references
test("after a denied call, a reply with a `!` line in a code block passes", async ($: Engine, on: On) => {
  engine(on);
  await deny($, "s-fence", "just sandbox");
  const out = await stop(
    $,
    "s-fence",
    "Run this:\n\n```sh\n! bash /tmp/run.sh\n```\n",
  );
  expect(out.block).toBeUndefined();
});

test("a stop after a block passes, so the block comes one time", async ($: Engine, on: On) => {
  engine(on);
  await deny($, "s-once", "just sandbox");
  expect((await stop($, "s-once", "Done.")).block).not.toBeUndefined();
  expect((await stop($, "s-once", "Done.", true)).block).toBeUndefined();
  expect((await stop($, "s-once", "Done.")).block).toBeUndefined();
});

test("a stop that is already a continuation of a block passes", async ($: Engine, on: On) => {
  engine(on);
  await deny($, "s-active", "just sandbox");
  const out = await stop($, "s-active", "Done.", true);
  expect(out.block).toBeUndefined();
});
