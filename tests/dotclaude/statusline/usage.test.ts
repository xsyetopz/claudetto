// The usage sample of the `statusline` slice: the main status line keeps the last `rate_limits` in `RATE_LIMITS_FILE` of the project (spec P35, step 5).
// The writes go to a fake, so that no file is written.

import { expect, test } from "bun:test";
import path from "node:path";
import { RATE_LIMITS_FILE } from "../../../src/kernel/paths.ts";
import type { FileReader } from "../../../src/kernel/ports.ts";
import { main } from "../../../src/plugins/dotclaude/slices/statusline/adapters/cli.ts";
import { USAGE_REWRITE_MS } from "../../../src/plugins/dotclaude/slices/statusline/limits.ts";
import { depsFor, NOW, type Run, STATUS } from "./support.ts";

const ROOT = "/work/dotclaude";

/** A fake `FileReader` whose every file has the text `saved`, or no file when it is null. */
const savedAs = (saved: string | null): FileReader => ({
  read: async () => saved,
  list: async () => [],
});

/** Runs the main status line on `input`, with a fake `write` that records each write. */
const runWith = async (
  input: unknown,
  write: (file: string, text: string) => Promise<void> = async () => {},
  files?: FileReader,
): Promise<{ run: Run; writes: [string, string][] }> => {
  const run: Run = { status: -1, out: [], err: [] };
  const writes: [string, string][] = [];
  run.status = await main(
    [],
    depsFor(input, run, {
      env: { COLUMNS: "124", NO_COLOR: "1" },
      ...(files ? { files } : {}),
      write: async (file, text) => {
        // The git cache also writes, so only the usage sample is recorded here.
        if (file.endsWith(RATE_LIMITS_FILE)) writes.push([file, text]);
        await write(file, text);
      },
    }),
  );
  return { run, writes };
};

test("the main status line keeps the last `rate_limits` in the runtime file of the project", async () => {
  const { writes } = await runWith(STATUS);
  expect(writes.length).toBe(1);
  const [file, text] = writes[0] ?? ["", ""];
  expect(file).toBe(path.join(ROOT, RATE_LIMITS_FILE));
  const sample = JSON.parse(text);
  expect(sample.savedAt).toBe(NOW);
  expect(sample.rate_limits).toStrictEqual(STATUS.rate_limits);
});

test("an equal sample with a fresh `savedAt` makes no write", async () => {
  const saved = JSON.stringify({
    savedAt: NOW - 120_000,
    rate_limits: STATUS.rate_limits,
  });
  const { writes, run } = await runWith(STATUS, undefined, savedAs(saved));
  expect(writes).toStrictEqual([]);
  expect(run.out.length).toBe(1);
});

test("an equal sample older than half the usage window is written again", async () => {
  const saved = JSON.stringify({
    savedAt: NOW - USAGE_REWRITE_MS - 1,
    rate_limits: STATUS.rate_limits,
  });
  const { writes } = await runWith(STATUS, undefined, savedAs(saved));
  expect(writes.length).toBe(1);
  expect(JSON.parse(writes[0]?.[1] ?? "{}").savedAt).toBe(NOW);
});

test("an equal sample exactly at the rewrite age makes no write", async () => {
  const saved = JSON.stringify({
    savedAt: NOW - USAGE_REWRITE_MS,
    rate_limits: STATUS.rate_limits,
  });
  const { writes } = await runWith(STATUS, undefined, savedAs(saved));
  expect(writes).toStrictEqual([]);
});

test("a sample with other `rate_limits` is written again", async () => {
  const saved = JSON.stringify({
    savedAt: NOW - 120_000,
    rate_limits: { five_hour: { used_percentage: 5 } },
  });
  const { writes } = await runWith(STATUS, undefined, savedAs(saved));
  expect(writes.length).toBe(1);
  expect(JSON.parse(writes[0]?.[1] ?? "{}").rate_limits).toStrictEqual(
    STATUS.rate_limits,
  );
});

test("a status object with no `rate_limits` writes no file", async () => {
  const { writes, run } = await runWith({ ...STATUS, rate_limits: undefined });
  expect(writes).toStrictEqual([]);
  expect(run.out.length).toBe(1);
});

test("a failed write keeps the status row and gives the cause on stderr", async () => {
  const { run } = await runWith(STATUS, async () => {
    throw new Error("disk full");
  });
  expect(run.status).toBe(0);
  expect(run.out.length).toBe(1);
  expect(run.out[0]).not.toBe("");
  expect(run.err.join("\n")).toContain("disk full");
});
