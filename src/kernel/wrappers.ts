// The wrapper commands that run another command, such as `sudo`, `env`, and `timeout`, for the shell reader of `shell.ts`.
// The functions are pure and import only `shell/words.ts`.

import { words } from "./shell/words.ts";

/** The options of each wrapper command that take a separate argument. */
const WRAPPER_OPTS: Record<string, Set<string>> = {
  sudo: new Set([
    "--user",
    "--group",
    "--host",
    "--prompt",
    "--chdir",
    "--role",
    "--type",
    "-u",
    "-g",
    "-h",
    "-p",
    "-C",
    "-D",
    "-R",
    "-T",
    "-U",
    "-r",
    "-t",
  ]),
  // `-S` is not here, because its value holds the command (`splitString`).
  env: new Set(["-u", "-C", "-P", "--unset", "--chdir"]),
  nice: new Set(["-n", "--adjustment"]),
  timeout: new Set(["-s", "-k", "--signal", "--kill-after"]),
  xargs: new Set([
    "-n",
    "-I",
    "-L",
    "-P",
    "-s",
    "-E",
    "-d",
    "-a",
    "--max-args",
    "--max-lines",
    "--max-procs",
    "--max-chars",
    "--delimiter",
    "--arg-file",
    "--eof",
  ]),
  doas: new Set(["-u", "-C"]),
  ionice: new Set(["-c", "-n", "-p", "-P", "-u", "--class", "--classdata"]),
  setsid: new Set(),
  chrt: new Set(["-T", "-P", "-D"]),
  stdbuf: new Set(["-i", "-o", "-e"]),
  exec: new Set(["-a"]),
  command: new Set(),
  builtin: new Set(),
  nohup: new Set(),
  time: new Set(["-f", "-o"]),
  noglob: new Set(),
  coproc: new Set(),
  caffeinate: new Set(["-t", "-w"]),
};

const ASSIGNMENT = /^\w+=/;

/**
 * Reads the option word `opt` of a wrapper, and removes its separate value from `rest`.
 * A short-option cluster, such as `-iS` or `-iu NAME`, is read letter by letter: a letter in `opts` takes the rest of the cluster as its value, or the next word when the cluster ends there.
 * For `env`, the value of `-S` or `--split-string` holds a command, and the function returns its text.
 */
const readOption = (
  head: string,
  opt: string,
  rest: string[],
  opts: Set<string>,
): string | undefined => {
  const env = head === "env";
  if (env && opt === "--split-string") return rest.shift() ?? "";
  if (env && opt.startsWith("--split-string=")) return opt.slice(15);
  if (opts.has(opt)) {
    rest.shift();
    return undefined;
  }
  if (opt.startsWith("--") || opt.length < 2) return undefined;
  for (let i = 1; i < opt.length; i++) {
    const tail = opt.slice(i + 1);
    if (env && opt[i] === "S") return tail === "" ? (rest.shift() ?? "") : tail;
    if (opts.has(`-${opt[i]}`)) {
      if (tail === "") rest.shift();
      return undefined;
    }
  }
  return undefined;
};

/** The last part of a path: `/usr/bin/git` gives `git`. */
export const baseName = (word: string): string => word.replace(/^.*\//, "");

/**
 * The words of `argv` after the wrapper commands (`sudo`, `env -i A=b`, `timeout 5`, `nice -n 5`, `xargs`, and others), their options, and `A=b` assignments.
 * The words of `env -S 'git reset'` are the words of its value.
 */
export const stripWrappers = (argv: string[]): string[] => {
  const rest = [...argv];
  while (rest.length) {
    if (ASSIGNMENT.test(rest[0] as string)) {
      rest.shift();
      continue;
    }
    const head = baseName(rest[0] as string);
    const opts = Object.hasOwn(WRAPPER_OPTS, head) && WRAPPER_OPTS[head];
    if (!opts) break;
    rest.shift();
    while (rest.length && (rest[0] as string).startsWith("-")) {
      const opt = rest.shift() as string;
      const split = readOption(head, opt, rest, opts);
      if (split !== undefined) rest.unshift(...words(split));
    }
    // `coproc NAME { git reset; }` names a group command.
    if (head === "coproc" && rest[1] === "{") rest.shift();
    if (head === "coproc" && rest[0] === "{") rest.shift();
    // `timeout` takes the duration, and `chrt` the priority, as its first plain word.
    if ((head === "timeout" || head === "chrt") && rest.length) rest.shift();
    while (head === "env" && rest.length && ASSIGNMENT.test(rest[0] as string))
      rest.shift();
  }
  return rest;
};
