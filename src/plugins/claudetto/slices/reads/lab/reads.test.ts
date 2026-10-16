// Lab tests of the `reads` slice, for the scenarios of the spec `ground-gates`:
// a rejected call is final, no read of an unchanged range again, the read gate checks the context, and a re-read after a rejected write.
// The core stub of `tool.call` answers a read, or a rejection in the dialog, and `session.messages` answers the results in the context.
// Each test has its own session id, because the hooks module keeps its record by session.
// The file is self-contained, because `just generate` copies it to `tests/` of the plugin, where it cannot import a relative file.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const CLEARED = "[Old tool result content cleared]";
const REJECTED = "User rejected tool use";

/** What a test changes in the stubs. */
type World = {
  session: string;
  mtimeMs: number;
  /** The text of each `tool_result` in the context. A call that is not here has no result in the context. */
  cleared?: boolean;
  gone?: boolean;
  /** The tools that the user rejects in the dialog. */
  rejects?: string[];
};

/** The stubs of one test. They return the ids of the calls that reached the core. */
const stub = (on: On, world: World) => {
  const ids: string[] = [];
  on("session.id", () => ({ value: world.session }));
  on("fs.exists", () => ({ value: false }));
  on("fs.stat", () => ({
    value: { kind: "file", size: 10, mtimeMs: world.mtimeMs, isLink: false },
  }));
  on("session.messages", () => ({
    value: world.gone
      ? []
      : [
          {
            role: "user",
            content: ids.map((id) => ({
              type: "tool_result",
              tool_use_id: id,
              content: world.cleared ? CLEARED : "1\tconst a = 1;",
            })),
          },
        ],
  }));
  on("tool.call", (_$, e) => {
    ids.push(e.tool_use_id);
    return world.rejects?.includes(e.tool)
      ? { isError: true, result: REJECTED }
      : { result: "ok" };
  });
  return ids;
};

const read = ($: Engine, extra: { offset?: number; limit?: number } = {}) =>
  $.tool.call({ tool: "Read", file_path: "/p/a.ts", ...extra });

const glob = ($: Engine, pattern: string) =>
  $.tool.call({ tool: "Agent", description: "scan", prompt: pattern });

const edit = ($: Engine, file_path = "/p/a.ts") =>
  $.tool.call({ tool: "Edit", file_path, old_string: "a", new_string: "b" });

// biome-ignore lint/plugin: a test name that a `slice.ts` file references
test("a call that the user rejected is denied when it comes again with the same input", async ($: Engine, on: On) => {
  stub(on, { session: "s-reject", mtimeMs: 1, rejects: ["Agent"] });
  expect((await glob($, "**/*.ts")).deny).toBeUndefined();
  const again = await glob($, "**/*.ts");
  expect(again.deny).toContain("rejected");
  expect(again.deny).toContain("`Agent`");
});

test("a call with another input runs after a rejection", async ($: Engine, on: On) => {
  const world = { session: "s-other", mtimeMs: 1, rejects: ["Agent"] };
  stub(on, world);
  await glob($, "**/*.ts");
  world.rejects = [];
  expect((await glob($, "**/*.md")).deny).toBeUndefined();
});

test("a rejection does not deny the same call in another session", async ($: Engine, on: On) => {
  const world = { session: "s-one", mtimeMs: 1, rejects: ["Agent"] };
  stub(on, world);
  await glob($, "**/*.ts");
  world.session = "s-two";
  world.rejects = [];
  expect((await glob($, "**/*.ts")).deny).toBeUndefined();
});

// biome-ignore lint/plugin: a test name that a `slice.ts` file references
test("a full read after the same full read is denied, and the reason gives the path and the range", async ($: Engine, on: On) => {
  stub(on, { session: "s-full", mtimeMs: 1 });
  expect((await read($)).deny).toBeUndefined();
  const second = await read($);
  expect(second.deny).toContain("/p/a.ts");
  expect(second.deny).toContain("1 to 2000");
});

test("a read of lines inside the range that Claude read is denied", async ($: Engine, on: On) => {
  stub(on, { session: "s-part", mtimeMs: 1 });
  await read($, { offset: 1, limit: 200 });
  const part = await read($, { offset: 50, limit: 31 });
  expect(part.deny).toContain("1 to 200");
});

test("a read of lines outside the range that Claude read runs", async ($: Engine, on: On) => {
  stub(on, { session: "s-out", mtimeMs: 1 });
  await read($, { offset: 1, limit: 200 });
  expect((await read($, { offset: 150, limit: 100 })).deny).toBeUndefined();
});

test("two reads that touch each other cover a read across both", async ($: Engine, on: On) => {
  stub(on, { session: "s-join", mtimeMs: 1 });
  await read($, { offset: 1, limit: 100 });
  await read($, { offset: 101, limit: 100 });
  expect((await read($, { offset: 90, limit: 20 })).deny).toContain("1 to 200");
});

test("a read of a changed file runs", async ($: Engine, on: On) => {
  const world = { session: "s-changed", mtimeMs: 1 };
  stub(on, world);
  await read($);
  world.mtimeMs = 2;
  expect((await read($)).deny).toBeUndefined();
  expect((await read($)).deny).toContain("/p/a.ts");
});

test("a read runs when the earlier result holds the cleared text", async ($: Engine, on: On) => {
  stub(on, { session: "s-cleared", mtimeMs: 1, cleared: true });
  await read($);
  expect((await read($)).deny).toBeUndefined();
});

test("a repeat of a denied read runs", async ($: Engine, on: On) => {
  stub(on, { session: "s-repeat", mtimeMs: 1 });
  await read($);
  expect((await read($)).deny).toContain("/p/a.ts");
  expect((await read($)).deny).toBeUndefined();
  expect((await read($)).deny).toContain("/p/a.ts");
});

test("a read runs after a handoff took the earlier result away", async ($: Engine, on: On) => {
  const world: World = { session: "s-handoff", mtimeMs: 1 };
  stub(on, world);
  await read($);
  world.gone = true;
  expect((await read($)).deny).toBeUndefined();
});

test("a subagent has its own record of reads", async ($: Engine, on: On) => {
  stub(on, { session: "s-agent", mtimeMs: 1 });
  await read($);
  const agent = { agentId: "agent-1" };
  const sub = await $.tool.call({
    tool: "Read",
    file_path: "/p/a.ts",
    ...agent,
  });
  expect(sub.deny).toBeUndefined();
});

// biome-ignore lint/plugin: a test name that a `slice.ts` file references
test("an edit after a rejected edit is denied, and the reason tells Claude to read the file", async ($: Engine, on: On) => {
  const world = { session: "s-write", mtimeMs: 1, rejects: ["Edit"] };
  stub(on, world);
  await read($);
  expect((await edit($)).deny).toBeUndefined();
  world.rejects = [];
  const again = await $.tool.call({
    tool: "Edit",
    file_path: "/p/a.ts",
    old_string: "a",
    new_string: "c",
  });
  expect(again.deny).toContain("Read");
  expect(again.deny).toContain("/p/a.ts");
});

test("an edit runs after a new read of the file", async ($: Engine, on: On) => {
  const world = { session: "s-reread", mtimeMs: 1, rejects: ["Edit"] };
  stub(on, world);
  await read($);
  await edit($);
  world.rejects = [];
  expect((await read($)).deny).toBeUndefined();
  const next = await $.tool.call({
    tool: "Edit",
    file_path: "/p/a.ts",
    old_string: "a",
    new_string: "c",
  });
  expect(next.deny).toBeUndefined();
});

test("an edit of another file runs after a rejected edit", async ($: Engine, on: On) => {
  const world = { session: "s-file", mtimeMs: 1, rejects: ["Edit"] };
  stub(on, world);
  await edit($);
  world.rejects = [];
  expect((await edit($, "/p/b.ts")).deny).toBeUndefined();
});
