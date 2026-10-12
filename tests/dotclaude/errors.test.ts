// Error policy of the `dotclaude` plugin: a `catch` handles the error that it expects and passes the others on.
// An expected error is an absent file or a line that is not JSON.
// An unexpected error is a symbolic link that points to itself (`ELOOP`), which the tests make in a folder under `TMPDIR`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  allRows,
  maxTurnsOf,
} from "../../plugins/dotclaude/features/context/turns.ts";
import { tailRows } from "../../plugins/dotclaude/hooks/PostToolUse/context.ts";
import {
  isExpected,
  rethrowUnless,
} from "../../plugins/dotclaude/lib/errors.ts";
import { tmpDir } from "../support/repo.ts";

const dir = tmpDir("dc-errors");
const absent = path.join(dir, "absent.jsonl");
const loop = path.join(dir, "loop");
fs.symlinkSync(loop, loop);

test("`rethrowUnless` returns for a listed code or name and throws the rest", () => {
  rethrowUnless(Object.assign(new Error("x"), { code: "ENOENT" }), "ENOENT");
  rethrowUnless(new SyntaxError("x"), "SyntaxError");
  const other = new TypeError("x");
  expect(() => rethrowUnless(other, "ENOENT", "SyntaxError")).toThrow(other);
  expect(isExpected(undefined, "ENOENT")).toBe(false);
});

test("the turn count and the tail read give no rows for an absent transcript and throw any other error", async () => {
  expect(await allRows(absent)).toStrictEqual([]);
  expect(await tailRows(absent)).toStrictEqual([]);
  await expect(allRows(loop)).rejects.toThrow(
    expect.objectContaining({ code: "ELOOP" }),
  );
  await expect(tailRows(loop)).rejects.toThrow(
    expect.objectContaining({ code: "ELOOP" }),
  );
});

test("cut lines are skipped when the rows are read", async () => {
  const file = path.join(dir, "rows.jsonl");
  await Bun.write(file, 'ial"}\n{"type":"assistant"}\n');
  expect(await allRows(file)).toStrictEqual([{ type: "assistant" }]);
  expect(await tailRows(file)).toStrictEqual([{ type: "assistant" }]);
});

test("`maxTurnsOf` gives undefined for an absent agent file and throws any other error", async () => {
  expect(await maxTurnsOf("nobody", dir)).toBe(undefined);
  fs.symlinkSync(
    path.join(dir, "agent-loop.md"),
    path.join(dir, "agent-loop.md"),
  );
  await expect(maxTurnsOf("agent-loop", dir)).rejects.toThrow(
    expect.objectContaining({ code: "ELOOP" }),
  );
});
