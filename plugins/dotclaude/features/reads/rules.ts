// The rules of the file-print deny (design D22): a `Bash` command that prints a file gets a `Read` call with the same range.
// Each part of a compound command is checked, as for the part alone (spec `hook-evals`, "Compound commands").
// The `Read` tool sends a short stub when the same range is read again, and a `Bash` slice gets none.
// The functions are pure. `printReason` gets the line count of a file from a `count` function, which `cli.ts` gives.
// A `count` of `Infinity` marks a file too large to read, and the deny then names the file with no range.

import { resolve, segments } from "../../lib/paths.ts";
import { words as shellWords } from "../../lib/shell.ts";

/** The `PreToolUse` payload fields that the print rule reads. */
export type Payload = {
  tool_name?: string;
  tool_input?: { command?: string };
  cwd?: string;
};

/** The line count of `file`: null when it cannot be read, and `Infinity` when it is too large to read. */
export type Count = (file: string) => Promise<number | null>;

/** The print of a command: the `file`, and the `offset` and `limit`, or the `tail` count. */
export type Print = {
  file: string;
  offset?: number;
  limit?: number;
  tail?: number;
};

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
export function words(command: unknown): string[] | null {
  const text = String(command).trim();
  // A quoted part may hold a glob character, but not a `$`, a backtick, a backslash, or a newline.
  const bare = text.replace(/'[^'$`\\\n]*'|"[^"$`\\\n]*"/g, "");
  return /[|&;<>()`$\\\n*?[\]{}~!#'"]/.test(bare) ? null : shellWords(text);
}

/** One part of a command list, and true when its output goes into a pipe. */
type Part = { text: string; piped: boolean };

/**
 * The parts of `command` split on `;`, `&&`, `||`, `|`, `&`, and new lines outside quotes, or null when it has a heredoc or an open quote.
 * A comment is not a part. A `&` of a redirect, such as `2>&1` or `&>`, does not split.
 */
function parts(command: string): Part[] | null {
  const out: Part[] = [];
  let cur = "";
  let quote: string | null = null;
  const push = (piped: boolean) => {
    if (cur.trim()) out.push({ text: cur.trim(), piped });
    cur = "";
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i] as string;
    const next = command[i + 1] ?? "";
    if (quote) {
      cur += c;
      if (c === quote) quote = null;
      else if (quote === '"' && c === "\\") cur += command[++i] ?? "";
    } else if (c === "\\") cur += c + (command[++i] ?? "");
    else if (c === "'" || c === '"') {
      quote = c;
      cur += c;
    } else if (c === "#" && /(?:^|\s)$/.test(cur)) {
      while (i + 1 < command.length && command[i + 1] !== "\n") i++;
    } else if (c === "<" && next === "<") return null;
    else if ((c === "&" || c === "|") && next === c) {
      push(false);
      i++;
    } else if (c === "|") push(true);
    else if (c === "&" && next !== ">" && !cur.endsWith(">")) push(false);
    else if (c === ";" || c === "\n") push(false);
    else cur += c;
  }
  if (quote) return null;
  push(false);
  return out;
}

/**
 * The prints of `command` whose output reaches the session, each with the folder of its relative path.
 * A part before a `|` prints into the pipe and not to the session.
 * A plain `cd DIR` changes the folder of the later parts, and another `cd` ends the check, because its folder is unknown.
 */
export function printsOf(
  command: unknown,
  cwd: string,
): { print: Print; dir: string }[] {
  const out: { print: Print; dir: string }[] = [];
  let dir = cwd;
  for (const part of parts(String(command ?? "")) ?? []) {
    const argv = words(part.text);
    if (/^cd(?:\s|$)/.test(part.text)) {
      const to = argv?.length === 2 ? (argv[1] as string) : "-";
      if (to.startsWith("-") || part.piped) break;
      dir = resolve(dir, to);
      continue;
    }
    const print = argv && !part.piped ? printOf(argv) : null;
    if (print) out.push({ print, dir });
  }
  return out;
}

/** True when `file` (absolute) is a generated file. A file in a temp folder is not generated, because a project can be there. */
export function generated(file: string): boolean {
  if (GENERATED_FILES.test(file)) return true;
  return segments(file).some((part) => GENERATED_DIRS.has(part));
}

/** The print that `argv` makes: `{ file, offset, limit }` (offset and limit may be absent, `tail` has `tail: n`), or null. */
export function printOf(argv: string[]): Print | null {
  const [cmd, ...args] = argv;
  if (
    cmd === "cat" &&
    args.length === 1 &&
    !(args[0] as string).startsWith("-")
  )
    return { file: args[0] as string };
  if (cmd === "sed" && args.length === 3 && args[0] === "-n") {
    const m = /^(\d+)(?:,(\d+))?p$/.exec(args[1] as string);
    if (!m || (args[2] as string).startsWith("-")) return null;
    const a = Number(m[1]);
    const b = Number(m[2] ?? m[1]);
    if (a < 1 || b < a) return null;
    return { file: args[2] as string, offset: a, limit: b - a + 1 };
  }
  if (cmd === "head" || cmd === "tail") return countedPrint(cmd, args);
  return null;
}

/** The print of `head` or `tail` with no option, `-n N`, `-N`, or (for `tail`) `-n +N`. */
function countedPrint(cmd: string, args: string[]): Print | null {
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
  const file = rest[0] as string;
  if (rest.length !== 1 || file.startsWith("-") || count < 1) return null;
  if (cmd === "head") return { file, offset: 1, limit: count };
  if (from) return { file, offset: count };
  return { file, tail: count };
}

/** The deny reason that names the `Read` call. `file` is absolute. */
export function denyReason(
  { offset, limit }: { offset?: number; limit?: number },
  file: string,
): string {
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

/**
 * The deny reason for the first print of a file in a `Bash` command, or null.
 * `payload.cwd` is the folder of a relative path. A generated file gets null, so the command stays allowed.
 */
export async function printReason(
  payload: Payload,
  count: Count,
): Promise<string | null> {
  if (payload?.tool_name !== "Bash") return null;
  const command = payload.tool_input?.command ?? "";
  for (const { print, dir } of printsOf(command, payload.cwd ?? "")) {
    const file = resolve(dir, print.file);
    if (generated(file)) continue;
    const deny = await printDeny(print, file, count);
    if (deny) return deny;
  }
  return null;
}

/** The deny reason of a file print, or null for a file that cannot be read or has no lines. */
async function printDeny(
  print: Print,
  file: string,
  count: Count,
): Promise<string | null> {
  const total = await count(file);
  if (total === null) return null;
  if (print.tail === undefined) return denyReason(print, file);
  if (total === 0) return null;
  // The count of a file too large to read is unknown, so the reason names the file alone.
  if (total === Infinity) return denyReason({}, file);
  const offset = Math.max(1, total - print.tail + 1);
  return denyReason({ offset, limit: total - offset + 1 }, file);
}
