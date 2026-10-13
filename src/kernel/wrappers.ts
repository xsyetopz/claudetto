// The wrapper commands that run another command, such as `sudo`, `env`, and `timeout`, for the shell reader of `shell.ts`.
// The functions are pure and import nothing.

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
  env: new Set(["-u", "-C", "-S", "--unset", "--chdir", "--split-string"]),
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
};

const ASSIGNMENT = /^\w+=/;

/** The last part of a path: `/usr/bin/git` gives `git`. */
export const baseName = (word: string): string => word.replace(/^.*\//, "");

/** The words of `argv` after the wrapper commands (`sudo`, `env -i A=b`, `timeout 5`, `nice -n 5`, `xargs`, and others), their options, and `A=b` assignments. */
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
      if (opts.has(opt)) rest.shift();
    }
    // `timeout` takes the duration, and `chrt` the priority, as its first plain word.
    if ((head === "timeout" || head === "chrt") && rest.length) rest.shift();
    while (head === "env" && rest.length && ASSIGNMENT.test(rest[0] as string))
      rest.shift();
  }
  return rest;
};
