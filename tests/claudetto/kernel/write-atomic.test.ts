// Tests of `writeAtomic` in `plugins/claudetto/kernel/node/fs.ts`: the file gets the text, and no temp file stays in its folder.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  writeAtomic,
  writeAtomicWith,
} from "../../../plugins/claudetto/kernel/node/fs.ts";
import { RENAME_TRIES } from "../../../plugins/claudetto/kernel/node/limits.ts";

const folder = (): string => fs.mkdtempSync(path.join(os.tmpdir(), "atomic-"));

const failure = (code: string): Error =>
  Object.assign(new Error(`${code}: the file is in use`), { code });

test("`writeAtomic` replaces the text of a file and leaves only that file in its folder", async () => {
  const dir = folder();
  const file = path.join(dir, "rate-limits.jsonl");
  await Bun.write(file, "old");
  await writeAtomic(file, "new");
  expect(await Bun.file(file).text()).toBe("new");
  expect(fs.readdirSync(dir)).toStrictEqual(["rate-limits.jsonl"]);
});

test("`writeAtomic` fails and leaves no temp file when the rename onto the file fails", async () => {
  const dir = folder();
  const target = path.join(dir, "settings.json");
  fs.mkdirSync(target);
  let failed = false;
  try {
    await writeAtomic(target, "new");
  } catch {
    failed = true;
  }
  expect(failed).toBe(true);
  expect(fs.readdirSync(dir)).toStrictEqual(["settings.json"]);
});

test("`writeAtomic` fails and leaves no temp file when the folder of the file is not a folder", async () => {
  const dir = folder();
  const blocker = path.join(dir, "blocker");
  await Bun.write(blocker, "x");
  let failed = false;
  try {
    await writeAtomic(path.join(blocker, "rate-limits.jsonl"), "new");
  } catch {
    failed = true;
  }
  expect(failed).toBe(true);
  expect(fs.readdirSync(dir)).toStrictEqual(["blocker"]);
});

test("`writeAtomicWith` retries a rename that fails with `EPERM` and then replaces the file", async () => {
  const dir = folder();
  const file = path.join(dir, "rate-limits.jsonl");
  await Bun.write(file, "old");
  let calls = 0;
  const rename = async (from: string, to: string): Promise<void> => {
    calls += 1;
    if (calls <= 2) throw failure("EPERM");
    await fs.promises.rename(from, to);
  };
  await writeAtomicWith(rename, file, "new");
  expect(calls).toBe(3);
  expect(await Bun.file(file).text()).toBe("new");
  expect(fs.readdirSync(dir)).toStrictEqual(["rate-limits.jsonl"]);
});

test("`writeAtomicWith` rethrows the error after its last try and removes the temp file", async () => {
  const dir = folder();
  const file = path.join(dir, "rate-limits.jsonl");
  await Bun.write(file, "old");
  let calls = 0;
  const rename = async (): Promise<void> => {
    calls += 1;
    throw failure("EBUSY");
  };
  let caught: unknown;
  try {
    await writeAtomicWith(rename, file, "new");
  } catch (err) {
    caught = err;
  }
  expect((caught as { code?: string }).code).toBe("EBUSY");
  expect(calls).toBe(RENAME_TRIES);
  expect(await Bun.file(file).text()).toBe("old");
  expect(fs.readdirSync(dir)).toStrictEqual(["rate-limits.jsonl"]);
});

test("`writeAtomicWith` does not retry a rename that fails with another code", async () => {
  const dir = folder();
  const file = path.join(dir, "rate-limits.jsonl");
  let calls = 0;
  const rename = async (): Promise<void> => {
    calls += 1;
    throw failure("ENOENT");
  };
  await expect(writeAtomicWith(rename, file, "new")).rejects.toThrow("ENOENT");
  expect(calls).toBe(1);
  expect(fs.readdirSync(dir)).toStrictEqual([]);
});

test("`writeAtomicWith` keeps the old text when a rename fails without a retry", async () => {
  const dir = folder();
  const file = path.join(dir, "settings.json");
  await Bun.write(file, "old");
  const rename = async (): Promise<void> => {
    throw failure("ENOSPC");
  };
  await expect(writeAtomicWith(rename, file, "new")).rejects.toThrow("ENOSPC");
  expect(await Bun.file(file).text()).toBe("old");
  expect(fs.readdirSync(dir)).toStrictEqual(["settings.json"]);
});

test("`writeAtomic` writes through a symlink, so the link stays and the linked file gets the text", async () => {
  const dir = folder();
  const real = path.join(dir, "dotfiles-settings.json");
  const link = path.join(dir, "settings.json");
  await Bun.write(real, "old");
  fs.symlinkSync(real, link);
  await writeAtomic(link, "new");
  expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
  expect(await Bun.file(real).text()).toBe("new");
  expect(fs.readdirSync(dir).sort()).toStrictEqual([
    "dotfiles-settings.json",
    "settings.json",
  ]);
});

test("`writeAtomic` keeps the mode of the file it replaces", async () => {
  const dir = folder();
  const file = path.join(dir, "settings.json");
  await Bun.write(file, "old");
  fs.chmodSync(file, 0o600);
  await writeAtomic(file, "new");
  expect(fs.statSync(file).mode & 0o777).toBe(0o600);
  expect(await Bun.file(file).text()).toBe("new");
});
