// Tests of `writeAtomic` in `src/kernel/node/fs.ts`: the file gets the text, and no temp file stays in its folder.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { RENAME_TRIES } from "../../src/kernel/budget.ts";
import { writeAtomic, writeAtomicWith } from "../../src/kernel/node/fs.ts";

const folder = (): string => fs.mkdtempSync(path.join(os.tmpdir(), "atomic-"));

const failure = (code: string): Error =>
  Object.assign(new Error(`${code}: the file is in use`), { code });

/**
 * The script of a Windows child that opens the file of its last argument for read with no share, prints `open`, and closes the file after 300 ms.
 * It prints `failed` and the Windows error code when the open fails.
 */
const HOLD_WITHOUT_SHARE = `
import { dlopen, FFIType, ptr } from "bun:ffi";
const { symbols: k } = dlopen("kernel32.dll", {
  CreateFileW: { args: ["ptr", "u32", "u32", "ptr", "u32", "u32", "ptr"], returns: FFIType.i64 },
  CloseHandle: { args: [FFIType.i64], returns: FFIType.bool },
  GetLastError: { args: [], returns: FFIType.u32 },
});
const name = Buffer.from(process.argv.at(-1) + "\\0", "utf16le");
const GENERIC_READ = 0x80000000, OPEN_EXISTING = 3, FILE_ATTRIBUTE_NORMAL = 0x80;
const handle = k.CreateFileW(ptr(name), GENERIC_READ, 0, null, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, null);
if (handle === -1n) {
  console.log("failed " + k.GetLastError());
  process.exit(1);
}
console.log("open");
await Bun.sleep(300);
k.CloseHandle(handle);
`;

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

test.skipIf(process.platform === "win32")(
  "`writeAtomic` keeps the mode of the file it replaces",
  async () => {
    const dir = folder();
    const file = path.join(dir, "settings.json");
    await Bun.write(file, "old");
    fs.chmodSync(file, 0o600);
    await writeAtomic(file, "new");
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
    expect(await Bun.file(file).text()).toBe("new");
  },
);

test.skipIf(process.platform !== "win32")(
  "`writeAtomic` replaces a file that another process holds open without delete share",
  async () => {
    const dir = folder();
    const file = path.join(dir, "rate-limits.jsonl");
    await Bun.write(file, "old");
    // A `bun` child opens the file with `CreateFileW` and the share mode 0, which also denies delete.
    // It starts in a fraction of the time of `powershell`, whose start alone came near the test timeout on CI.
    const holder = Bun.spawn(
      [process.execPath, "-e", HOLD_WITHOUT_SHARE, file],
      { stdout: "pipe" },
    );
    const reader = holder.stdout.getReader();
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value).trim()).toBe("open");
    await writeAtomic(file, "new");
    await holder.exited;
    expect(await Bun.file(file).text()).toBe("new");
    expect(fs.readdirSync(dir)).toStrictEqual(["rate-limits.jsonl"]);
  },
);
