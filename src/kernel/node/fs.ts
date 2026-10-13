// The `FileReader` of Node, for the CLIs. A missing file gives null, and a missing folder gives an empty list.

import fs from "node:fs/promises";
import { RENAME_TRIES, RENAME_WAIT_MS } from "../budget.ts";
import { isExpected, rethrowUnless, UNREADABLE } from "../errors.ts";
import type { FileReader } from "../ports.ts";

/** The `code` values of a rename that fails for a short time while another process holds the target open, on Windows. */
const BUSY_RENAME = ["EPERM", "EACCES", "EBUSY"];

type Rename = (from: string, to: string) => Promise<void>;

/** Renames `from` to `to`, and tries again after a short wait when the error is one of `BUSY_RENAME`. */
const renameRetrying = async (
  rename: Rename,
  from: string,
  to: string,
): Promise<void> => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await rename(from, to);
      return;
    } catch (err) {
      if (attempt >= RENAME_TRIES || !isExpected(err, ...BUSY_RENAME))
        throw err;
      await Bun.sleep(RENAME_WAIT_MS);
    }
  }
};

/** `writeAtomic` with the rename given as `rename`, so a test can make the rename fail. */
export const writeAtomicWith = async (
  rename: Rename,
  file: string,
  text: string,
): Promise<void> => {
  const tmp = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    await Bun.write(tmp, text);
    await renameRetrying(rename, tmp, file);
  } catch (err) {
    await fs.rm(tmp, { force: true });
    throw err;
  }
};

/** Writes `text` to `file` through a temp file in the same folder and a rename, so a reader never sees half a file. The temp file is removed when the write fails. */
export const writeAtomic = (file: string, text: string): Promise<void> =>
  writeAtomicWith(fs.rename, file, text);

export const fileReader: FileReader = {
  read: async (file) => {
    try {
      return await Bun.file(file).text();
    } catch (err) {
      rethrowUnless(err, ...UNREADABLE);
      return null;
    }
  },
  list: async (dir) => {
    try {
      return await fs.readdir(dir);
    } catch (err) {
      rethrowUnless(err, ...UNREADABLE);
      return [];
    }
  },
};
