// Tests of the Node and Bun adapters: `fileReader` and `runHook`.
// An injected reader and writer replace stdin and stdout.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileReader } from "../../plugins/claudetto/kernel/node/fs.ts";
import { runHook } from "../../plugins/claudetto/kernel/node/hook-io.ts";

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
