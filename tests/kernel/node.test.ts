// Tests of the Node and Bun adapters: `fileReader`, `readTail`, `runHook`, and the output builders.
// An injected reader and writer replace stdin and stdout.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileReader } from "../../src/kernel/node/fs.ts";
import {
  postToolUse,
  preToolUse,
  runHook,
} from "../../src/kernel/node/hook-io.ts";
import { readTail } from "../../src/kernel/node/tail.ts";

/** Runs `decide` on the text `input` and gives the text that the hook wrote. `failed` collects the stderr text. */
const run = async (
  decide: (payload: unknown) => unknown,
  input: string,
  failed: string[] = [],
) => {
  const written: string[] = [];
  await runHook(decide, {
    read: () => input,
    write: (t) => written.push(t),
    fail: (t) => failed.push(t),
  });
  return written;
};

test("`readTail` returns the end of a file and says when it cut the start", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kernel-tail-"));
  try {
    const file = path.join(dir, "t.txt");
    await Bun.write(file, "0123456789");
    expect(await readTail(file, 4)).toStrictEqual({
      text: "6789",
      truncated: true,
    });
    expect(await readTail(file, 20)).toStrictEqual({
      text: "0123456789",
      truncated: false,
    });
    expect(await readTail(path.join(dir, "absent.txt"), 4)).toBe(null);
    expect(await readTail(dir, 4)).toBe(null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a valid payload reaches decide and its output is printed as JSON", async () => {
  const seen: unknown[] = [];
  const out = await run((p) => {
    seen.push(p);
    return { ok: 1 };
  }, '{"tool_name":"Bash"}');
  expect(seen).toStrictEqual([{ tool_name: "Bash" }]);
  expect(out).toStrictEqual(['{"ok":1}']);
});

test("a payload that is not JSON prints nothing and does not call decide", async () => {
  let called = false;
  const out = await run(() => {
    called = true;
    return { ok: 1 };
  }, "{not json");
  expect(out).toStrictEqual([]);
  expect(called).toBe(false);
});

test("a decide that returns undefined prints nothing", async () => {
  expect(await run(() => undefined, "{}")).toStrictEqual([]);
});

test("a payload that is not JSON writes nothing to stderr", async () => {
  const failed: string[] = [];
  await run(() => ({ ok: 1 }), "{not json", failed);
  expect(failed).toStrictEqual([]);
});

test("a decide that throws prints nothing on stdout and reports the error on stderr", async () => {
  const failed: string[] = [];
  const out = await run(
    () => {
      throw new Error("rule broke");
    },
    "{}",
    failed,
  );
  expect(out).toStrictEqual([]);
  expect(failed.length).toBe(1);
  expect(failed[0]).toMatch(/rule broke/);
});

test("a decide that throws a `SyntaxError` is reported, because it is a defect and not a bad payload", async () => {
  const failed: string[] = [];
  await run(() => JSON.parse("{"), "{}", failed);
  expect(failed.length).toBe(1);
});

test("a reader that throws prints nothing on stdout and reports the error on stderr", async () => {
  const written: string[] = [];
  const failed: string[] = [];
  await runHook(() => ({ ok: 1 }), {
    read: () => {
      throw new Error("no stdin");
    },
    write: (t) => written.push(t),
    fail: (t) => failed.push(t),
  });
  expect(written).toStrictEqual([]);
  expect(failed.join("")).toMatch(/no stdin/);
});

test("the `PreToolUse` builder keeps the given fields and leaves out the others", () => {
  expect(
    preToolUse({ permissionDecision: "deny", permissionDecisionReason: "r" }),
  ).toStrictEqual({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "r",
    },
  });
  const updated = preToolUse({ updatedInput: { command: "c" } });
  expect(Object.keys(updated.hookSpecificOutput)).toStrictEqual([
    "hookEventName",
    "updatedInput",
  ]);
});

test("the `PostToolUse` builder gives `additionalContext`", () => {
  expect(postToolUse({ additionalContext: "note" })).toStrictEqual({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: "note",
    },
  });
});

test("`fileReader` gives `null` and `[]` for a path that names no file", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reader-"));
  await Bun.write(path.join(dir, "a.txt"), "a");
  expect(await fileReader.read(path.join(dir, "missing"))).toBeNull();
  expect(await fileReader.read(path.join(dir, "a.txt", "b"))).toBeNull();
  expect(await fileReader.list(path.join(dir, "missing"))).toStrictEqual([]);
  fs.rmSync(dir, { recursive: true });
});

// Root can read a folder with mode `000`, so the test cannot fail for root.
test.skipIf(process.getuid?.() === 0)(
  "`fileReader` rejects a read error, which is not an absent file",
  async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reader-"));
    const locked = path.join(dir, "locked");
    fs.mkdirSync(locked);
    await Bun.write(path.join(locked, "a.txt"), "a");
    fs.chmodSync(locked, 0o000);
    try {
      await expect(fileReader.list(locked)).rejects.toMatchObject({
        code: "EACCES",
      });
      await expect(
        fileReader.read(path.join(locked, "a.txt")),
      ).rejects.toMatchObject({ code: "EACCES" });
      await expect(fileReader.read(dir)).rejects.toMatchObject({
        code: "EISDIR",
      });
    } finally {
      fs.chmodSync(locked, 0o700);
      fs.rmSync(dir, { recursive: true });
    }
  },
);
