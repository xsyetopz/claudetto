// The rules of the file-print deny (design D22): a `Bash` command that only prints a file gets a `Read` call with the same range.
// The `Read` tool sends a short stub when the same range is read again, and a `Bash` slice gets none.
// The functions are pure. `cli.mjs` reads the line count of a file for `tail`.

import path from "node:path";
import { words as shellWords } from "../../lib/shell.mjs";

/** A path segment or a file name that marks a generated file. The command stays allowed for it. */
const GENERATED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "target",
  "coverage",
  ".next",
  "out",
  "__pycache__",
]);
const GENERATED_FILES =
  /(?:\.(?:log|map|lock|min\.js|min\.css|tsbuildinfo)|package-lock\.json|bun\.lockb?)$/;

/**
 * The words of `command` when it is one simple command, else null.
 * A pipe, a list, a redirect, a substitution, a variable, a glob, or a second line makes it not simple.
 */
export function words(command) {
  const text = String(command).trim();
  // A quoted part may hold a glob character, but not a `$`, a backtick, a backslash, or a newline.
  const bare = text.replace(/'[^'$`\\\n]*'|"[^"$`\\\n]*"/g, "");
  return /[|&;<>()`$\\\n*?[\]{}~!#'"]/.test(bare) ? null : shellWords(text);
}

/** True when `file` (absolute) is a generated file. A file in a temp folder is not generated, because a project can be there. */
export function generated(file) {
  if (GENERATED_FILES.test(file)) return true;
  return file.split(path.sep).some((part) => GENERATED_DIRS.has(part));
}

/** The print that `argv` makes: `{ file, offset, limit }` (offset and limit may be absent, `tail` has `tail: n`), or null. */
export function printOf(argv) {
  const [cmd, ...args] = argv;
  if (cmd === "cat" && args.length === 1 && !args[0].startsWith("-"))
    return { file: args[0] };
  if (cmd === "sed" && args.length === 3 && args[0] === "-n") {
    const m = /^(\d+)(?:,(\d+))?p$/.exec(args[1]);
    if (!m || args[2].startsWith("-")) return null;
    const a = Number(m[1]);
    const b = Number(m[2] ?? m[1]);
    if (a < 1 || b < a) return null;
    return { file: args[2], offset: a, limit: b - a + 1 };
  }
  if (cmd === "head" || cmd === "tail") return countedPrint(cmd, args);
  return null;
}

/** The print of `head` or `tail` with no option, `-n N`, `-N`, or (for `tail`) `-n +N`. */
function countedPrint(cmd, args) {
  let count = 10;
  let from = false;
  let rest = args;
  const dash = /^-n$|^-(\d+)$/.exec(args[0] ?? "");
  if (dash) {
    const raw = dash[1] ?? args[1];
    const m = /^(\+?)(\d+)$/.exec(raw ?? "");
    if (!m || (m[1] && cmd === "head")) return null;
    count = Number(m[2]);
    from = m[1] === "+";
    rest = args.slice(dash[1] ? 1 : 2);
  }
  if (rest.length !== 1 || rest[0].startsWith("-") || count < 1) return null;
  if (cmd === "head") return { file: rest[0], offset: 1, limit: count };
  if (from) return { file: rest[0], offset: count };
  return { file: rest[0], tail: count };
}

/** The deny reason that names the `Read` call. `file` is absolute. */
export function denyReason({ offset, limit }, file) {
  const parts = [`\`file_path\` \`${file}\``];
  if (offset !== undefined) parts.push(`\`offset\` ${offset}`);
  if (limit !== undefined) parts.push(`\`limit\` ${limit}`);
  if (parts.length > 1) parts[parts.length - 1] = `and ${parts.at(-1)}`;
  return [
    "This command only prints a file.",
    "The `Read` tool sends a short stub when you read the same range of an unchanged file again, and a Bash print gets no stub.",
    `Call \`Read\` with ${parts.join(", ")} instead.`,
  ].join("\n");
}
