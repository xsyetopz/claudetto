// The end of a file, for a transcript that is too large to read whole.

import { rethrowUnless, UNREADABLE } from "./errors.ts";

/**
 * The last `max` bytes of `file` as `{ text, truncated }`, or null when the file is absent or not a readable file.
 * `truncated` is true when the file is larger than `max`, and then the first line of `text` may be cut.
 * Any other error is thrown.
 */
export async function readTail(
  file: string,
  max: number,
): Promise<{ text: string; truncated: boolean } | null> {
  const bun = Bun.file(file);
  try {
    const stat = await bun.stat();
    // Windows opens a folder without an error, and POSIX gives `EISDIR` on the read.
    if (stat.isDirectory()) return null;
    const size = stat.size;
    const length = Math.min(size, max);
    const text = await bun.slice(size - length, size).text();
    return { text, truncated: size > length };
  } catch (err) {
    rethrowUnless(err, ...UNREADABLE);
    return null;
  }
}
