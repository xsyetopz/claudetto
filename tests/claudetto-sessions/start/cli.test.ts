// Tests of the file choice of `claudetto-start`: the newest transcript of a folder, the missing file, and the exit codes of the bin.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  exists,
  newestSession,
} from "../../../plugins/claudetto-sessions/slices/start-cost/domain/report.ts";
import { store } from "../../../src/plugins/claudetto-sessions/slices/start-cost/adapters/store.ts";
import { PLUGINS, tmpDir } from "../../support/repo.ts";
import { runBin } from "../spawn.ts";

const BIN = path.join(PLUGINS, "claudetto-sessions", "bin", "claudetto-start");

test("`newestSession` gives the transcript with the latest modification time and skips other files", async () => {
  const dir = tmpDir("newest");
  const touch = async (name: string, seconds: number) => {
    const file = path.join(dir, name);
    await Bun.write(file, "");
    fs.utimesSync(file, seconds, seconds);
  };
  await touch("old.jsonl", 1000);
  await touch("new.jsonl", 3000);
  await touch("newer.txt", 5000);
  expect(await newestSession(store, dir)).toBe(path.join(dir, "new.jsonl"));
});

test("`newestSession` gives null for an absent folder and for a folder with no transcript", async () => {
  const dir = tmpDir("newest-none");
  expect(await newestSession(store, dir)).toBe(null);
  expect(await newestSession(store, path.join(dir, "absent"))).toBe(null);
});

test("`exists` is true for a file and false for an absent path", async () => {
  const dir = tmpDir("exists");
  await Bun.write(path.join(dir, "a.jsonl"), "");
  expect(await exists(store, path.join(dir, "a.jsonl"))).toBe(true);
  expect(await exists(store, path.join(dir, "b.jsonl"))).toBe(false);
});

test("the bin exits 2 for an absent transcript and for a `--compare` with one path", () => {
  const dir = tmpDir("bin-missing");
  const missing = runBin(BIN, [path.join(dir, "none.jsonl")]);
  expect(missing.status).toBe(2);
  const compare = runBin(BIN, ["--compare", path.join(dir, "none.jsonl")]);
  expect(compare.status).toBe(2);
});
