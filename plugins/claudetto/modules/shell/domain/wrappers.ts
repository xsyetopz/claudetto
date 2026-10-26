// The wrapper commands that run another command (`sudo`, `env`, `timeout`), for `shell.ts`. No import.

/** The words of one shell segment, with quotes and backslashes removed, also inside a word (`r''m`, `\rm`). */
export const words = (text: unknown): string[] =>
  [...String(text).matchAll(/(?:'[^']*'|"[^"]*"|\\.|[^\s'"\\])+/g)].map((m) =>
    m[0].replace(/'([^']*)'|"([^"]*)"|\\(.)/g, (_, a, b, c) => a ?? b ?? c),
  );

/** Each wrapper with the options that take a value. `-S` is not in `env`, because its value holds the command. */
const WRAPPERS: Record<string, string> = {
  sudo: "--user --group --host --prompt --chdir --role --type -u -g -h -p -C -D -R -T -U -r -t",
  env: "-u -C -P --unset --chdir",
  nice: "-n --adjustment",
  timeout: "-s -k --signal --kill-after",
  xargs:
    "-n -I -L -P -s -E -d -a --max-args --max-lines --max-procs --max-chars --delimiter --arg-file --eof",
  doas: "-u -C",
  ionice: "-c -n -p -P -u --class --classdata",
  chrt: "-T -P -D",
  stdbuf: "-i -o -e",
  exec: "-a",
  time: "-f -o",
  caffeinate: "-t -w",
  ...Object.fromEntries(
    "setsid command builtin nohup noglob coproc".split(" ").map((w) => [w, ""]),
  ),
};

const ASSIGNMENT = /^\w+=/;

/** The last part of a path: `/usr/bin/git` gives `git`. */
export const baseName = (word: string): string => word.replace(/^.*\//, "");

/** Reads a short-option cluster (`-iS`, `-iu NAME`) letter by letter: a letter in `opts` takes the rest of the cluster as its value, or the next word. */
const readCluster = (
  env: boolean,
  opt: string,
  rest: string[],
  opts: string[],
): string | undefined => {
  for (let i = 1; i < opt.length; i++) {
    const split = env && opt[i] === "S";
    if (!split && !opts.includes(`-${opt[i]}`)) continue;
    const value = opt.slice(i + 1) || rest.shift();
    return split ? (value ?? "") : undefined;
  }
  return undefined;
};

/**
 * Reads the option word `opt` of the wrapper `head`, and removes its separate value from `rest`.
 * For `env`, the value of `-S` or `--split-string` holds a command, and the function returns its text.
 */
const readOption = (
  head: string,
  opt: string,
  rest: string[],
  opts: string[],
): string | undefined => {
  if (head === "env" && /^--split-string(?:=|$)/.test(opt))
    return opt.length > 14 ? opt.slice(15) : (rest.shift() ?? "");
  if (opts.includes(opt)) rest.shift();
  if (opts.includes(opt) || opt.startsWith("--")) return undefined;
  return readCluster(head === "env", opt, rest, opts);
};

/** Removes the words after the options of the wrapper `head`: the group, the duration, and the assignments. */
const dropOperands = (head: string, rest: string[]): void => {
  // `coproc NAME { git reset; }` names a group command.
  if (head === "coproc" && rest[1] === "{") rest.shift();
  if (head === "coproc" && rest[0] === "{") rest.shift();
  // `timeout` takes the duration, and `chrt` the priority, as its first plain word.
  if ((head === "timeout" || head === "chrt") && rest.length) rest.shift();
  while (head === "env" && ASSIGNMENT.test(rest[0] ?? "")) rest.shift();
};

/** The words of `argv` after the wrapper commands, their options, and `A=b` assignments. The words of `env -S 'git reset'` are the words of its value. */
export const stripWrappers = (argv: string[]): string[] => {
  const rest = [...argv];
  while (rest.length) {
    const head = baseName(rest[0] as string);
    if (ASSIGNMENT.test(rest[0] as string)) rest.shift();
    else if (!Object.hasOwn(WRAPPERS, head)) break;
    else {
      rest.shift();
      const opts = (WRAPPERS[head] as string).split(" ");
      while ((rest[0] ?? "").startsWith("-")) {
        const split = readOption(head, rest.shift() as string, rest, opts);
        if (split !== undefined) rest.unshift(...words(split));
      }
      dropOperands(head, rest);
    }
  }
  return rest;
};
