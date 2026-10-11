// The end of a file, for a transcript that is too large to read whole.

import { closeSync, fstatSync, openSync, readSync } from "node:fs";
import { rethrowUnless, UNREADABLE } from "./errors.mjs";

/**
 * The last `max` bytes of `file` as `{ text, truncated }`, or null when the file is absent or not a readable file.
 * `truncated` is true when the file is larger than `max`, and then the first line of `text` may be cut.
 * Any other error is thrown.
 */
export function readTail(file, max) {
  let fd;
  try {
    fd = openSync(file, "r");
    const stat = fstatSync(fd);
    // Windows opens a folder without an error, and POSIX gives `EISDIR` on the read.
    if (stat.isDirectory()) return null;
    const size = stat.size;
    const length = Math.min(size, max);
    const buffer = Buffer.alloc(length);
    const n = readSync(fd, buffer, 0, length, size - length);
    return { text: buffer.toString("utf8", 0, n), truncated: size > length };
  } catch (err) {
    rethrowUnless(err, ...UNREADABLE);
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}
