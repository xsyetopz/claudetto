// What a simple command does with its input and its arguments, for the shell reader of `shell.ts`:
// a shell runs them as a script, a loop or `xargs` runs their lines, a data command only reads them,
// and any other program can run them as code in a language that the shell reader does not know.
// The functions are pure and import only `wrappers.ts`.

import { baseName, stripWrappers } from "./wrappers.ts";

/** The reserved words that can stand before a command. */
export const RESERVED = new Set([
  "{",
  "}",
  "!",
  "if",
  "then",
  "else",
  "elif",
  "fi",
  "while",
  "until",
  "do",
  "done",
]);

export const SHELLS = /^(?:ba|z|da|k)?sh$/;

/** The commands that run the lines of their input, such as `while read c; do bash -c "$c"; done <<'X'`. */
const FEEDS = new Set([
  "done",
  "read",
  "mapfile",
  "readarray",
  "xargs",
  "parallel",
]);

const XARGS = /^(?:.*\/)?(?:xargs|parallel)$/;

/**
 * The commands that only read their input and their arguments as data, and run no code from them.
 * Any other program can run code from them, so the guards read that text as code.
 */
const DATA = new Set([
  "cat",
  "tee",
  "echo",
  "printf",
  "git",
  "gh",
  "grep",
  "egrep",
  "fgrep",
  "rg",
  "ag",
  "jq",
  "yq",
  "head",
  "tail",
  "wc",
  "sort",
  "uniq",
  "cut",
  "tr",
  "diff",
  "cmp",
  "base64",
  "pbcopy",
  "less",
  "column",
  "ls",
  "mkdir",
  "cd",
  "export",
  "test",
  "[",
  "true",
  "false",
  ":",
]);

/** True when `argv` is a shell with no `-c` script, so it reads a script from its standard input. */
export const readsScript = (argv: string[]): boolean => {
  const [head, ...args] = stripWrappers(argv);
  return (
    SHELLS.test(baseName(head ?? "")) &&
    !args.some((a) => /^-[A-Za-z]*c[A-Za-z]*$/.test(a))
  );
};

/** The script text that `argv` runs through `sh -c`, `bash -c`, or `eval`, or undefined. */
export const scriptOf = (argv: string[]): string | undefined => {
  const [head, ...args] = stripWrappers(argv);
  const name = head && baseName(head);
  if (name === "eval") return args.join(" ");
  if (!SHELLS.test(name ?? "")) return undefined;
  const at = args.findIndex((a) => /^-[A-Za-z]*c[A-Za-z]*$/.test(a));
  if (at < 0) return undefined;
  return args[args[at + 1] === "--" ? at + 2 : at + 1];
};

/**
 * True when `argv` is a program that can run its input or its arguments as code in any language, such as `python3`, `node`, or `awk`.
 * A shell, `eval`, a loop, a data command, and a command in a variable are read in other ways, so they are not.
 */
export const runsCode = (argv: string[]): boolean => {
  const name = baseName(stripWrappers(argv)[0] ?? "");
  return !(
    name === "" ||
    name === "eval" ||
    name === "source" ||
    name === "." ||
    name.startsWith("$") ||
    SHELLS.test(name) ||
    FEEDS.has(name) ||
    DATA.has(name) ||
    RESERVED.has(name)
  );
};

/**
 * What the command `head` does with a heredoc body:
 * `"script"` when it is a shell that reads the body as a script, `"feed"` when it runs the lines of the body,
 * `"code"` when it is a program that can run the body as code, and `"data"` when it only reads the body.
 */
export const bodyKind = (
  head: string[],
): "script" | "feed" | "code" | "data" => {
  if (readsScript(head)) return "script";
  const name = baseName(stripWrappers(head)[0] ?? "");
  if (
    FEEDS.has(name) ||
    SHELLS.test(name) ||
    head.some((w) => FEEDS.has(baseName(w)))
  )
    return "feed";
  return runsCode(head) ? "code" : "data";
};

/**
 * How much of the held text `argv` can run as a script that the reader cannot see.
 * 2 for a script from the input or a substitution (`| sh`, `source /dev/stdin`, `sh -c "$(cat)"`): each held body.
 * 1 for a script in a variable or from `xargs` (`bash -c "$c"`, `eval "$c"`, `$c`), or a name that a substitution wrote (`$(echo git)`, which the scan gives as `""`): each `"feed"` body.
 * 0 for none.
 */
export const hiddenLevel = (
  argv: string[],
  script: string | undefined,
): number => {
  const first = stripWrappers(argv)[0];
  const name = baseName(first ?? "");
  if (readsScript(argv) || name === "source" || name === "." || script === "")
    return 2;
  // `xargs -I{} sh -c '{}'` puts each line of its input into the script.
  const fed = script !== undefined && argv.some((w) => XARGS.test(w));
  const unreadable = first === "" || name.startsWith("$");
  return fed || script?.includes("$") || unreadable ? 1 : 0;
};
