// The deny of the file-print rule (design D22): a `Bash` command that prints a file gets a `Read` call with the same range.
// The `Read` tool sends a short stub when the same range is read again, and a `Bash` print gets none.
// `printReason` gets the line count of a file from a `count` function, which `adapters/mod.ts` gives.
// A `count` of `Infinity` marks a file too large to read, and the deny then names the file with no range.

import { resolve } from "./paths.ts";
import { generated, type Print, printsOf } from "./reads.ts";

/** The line count of `file`: null when it cannot be read, and `Infinity` when it is too large to read. */
export type Count = (file: string) => Promise<number | null>;

/** The deny reason that names the `Read` call. `file` is absolute. */
export const denyReason = (
  { offset, limit }: { offset?: number; limit?: number },
  file: string,
): string => {
  const parts = [`\`file_path\` \`${file}\``];
  if (offset !== undefined) parts.push(`\`offset\` ${offset}`);
  if (limit !== undefined) parts.push(`\`limit\` ${limit}`);
  if (parts.length > 1) parts[parts.length - 1] = `and ${parts.at(-1)}`;
  return [
    "This command only prints a file.",
    "The `Read` tool sends a short stub when you read the same range of an unchanged file again, and a Bash print gets no stub.",
    `Call \`Read\` with ${parts.join(", ")} instead.`,
  ].join("\n");
};

/** The deny reason of a file print, or null for a file that cannot be read or has no lines. */
const printDeny = async (
  print: Print,
  file: string,
  count: Count,
): Promise<string | null> => {
  const total = await count(file);
  if (total === null) return null;
  if (print.tail === undefined) return denyReason(print, file);
  if (total === 0) return null;
  // The count of a file too large to read is unknown, so the reason names the file alone.
  if (total === Infinity) return denyReason({}, file);
  const offset = Math.max(1, total - print.tail + 1);
  return denyReason({ offset, limit: total - offset + 1 }, file);
};

/**
 * The deny reason for the first print of a file in a `Bash` command, or null.
 * `cwd` is the folder of a relative path. A generated file gets null, so the command stays allowed.
 */
export const printReason = async (
  command: string,
  cwd: string,
  count: Count,
): Promise<string | null> => {
  for (const { print, dir } of printsOf(command, cwd)) {
    const file = resolve(dir, print.file);
    if (generated(file)) continue;
    const deny = await printDeny(print, file, count);
    if (deny) return deny;
  }
  return null;
};
