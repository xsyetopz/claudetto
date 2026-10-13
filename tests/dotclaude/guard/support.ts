// Test helper for the file-print deny of the `guard` slice.
// `denyOf` gives the deny reason of `printReason`, with a line count that reads the real file.
// A file that is absent gives null, and an error that is not an unreadable code is thrown again, as the tests check.

import {
  type Count,
  printReason,
} from "../../../plugins/dotclaude/slices/guard/domain/deny.ts";
import { READ_MAX_BYTES } from "../../../plugins/dotclaude/slices/guard/limits.ts";
import { rethrowUnless, UNREADABLE } from "../../../src/kernel/errors.ts";
import { lineCount } from "../../../src/kernel/text.ts";

/** The count of lines in `file`, `null` when it cannot be read, or `Infinity` when it is over `READ_MAX_BYTES`. */
export const readLines: Count = async (file) => {
  try {
    const bytes = Bun.file(file);
    if (bytes.size > READ_MAX_BYTES) return Infinity;
    return lineCount(await bytes.text());
  } catch (err) {
    rethrowUnless(err, ...UNREADABLE);
    return null;
  }
};

/** The deny reason for `command` run in `cwd`, or `null`. `count` gives the lines of a file. */
export const denyOf = (
  command: string,
  cwd: string,
  count: Count = readLines,
): Promise<string | null> => printReason(command, cwd, count);
