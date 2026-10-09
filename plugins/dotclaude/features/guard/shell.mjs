// The shell syntax that the `rm` rule of the guard reads (design D28).
// The guard cannot run the shell, so each reader here is conservative:
// a form that it cannot read is a form that makes the rule ask.

/** The words of one shell segment, with quotes and backslashes removed, also inside a word (`r''m`, `\rm`). */
export const words = (segment) =>
  [...segment.matchAll(/(?:'[^']*'|"[^"]*"|\\.|[^\s'"\\])+/g)].map((m) =>
    m[0].replace(/'([^']*)'|"([^"]*)"|\\(.)/g, (_, a, b, c) => a ?? b ?? c),
  );

/** The options of each prefix command that take a separate argument. */
const PREFIX_OPTS = {
  sudo: new Set([
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
  xargs: new Set(["-n", "-I", "-L", "-P", "-s", "-E", "-d", "-a"]),
  exec: new Set(["-a"]),
  command: new Set(),
  builtin: new Set(),
  nohup: new Set(),
  time: new Set(["-f", "-o"]),
};

/** The words of `argv` after the prefix commands (`sudo`, `env A=b`, `timeout 5`, `nice -n 5`, `xargs`, and others) and their arguments. */
export function stripPrefix(argv) {
  const rest = [...argv];
  while (rest.length) {
    if (/^\w+=/.test(rest[0])) {
      rest.shift();
      continue;
    }
    const opts = PREFIX_OPTS[rest[0].replace(/^.*\//, "")];
    if (!opts) break;
    const head = rest.shift().replace(/^.*\//, "");
    while (rest.length && rest[0].startsWith("-")) {
      const opt = rest.shift();
      if (opts.has(opt) && opt !== "--") rest.shift();
    }
    // `timeout` takes the duration as its first plain word.
    if (head === "timeout" && rest.length) rest.shift();
    while (head === "env" && rest.length && /^\w+=/.test(rest[0])) rest.shift();
  }
  return rest;
}

/** The text of each command substitution (`$(...)` and backticks) in `text`. */
export function substitutions(text) {
  const found = [];
  for (let i = text.indexOf("$("); i >= 0; i = text.indexOf("$(", i + 2)) {
    let depth = 0;
    let j = i + 1;
    for (; j < text.length; j++) {
      if (text[j] === "(") depth++;
      if (text[j] === ")" && --depth === 0) break;
    }
    found.push(text.slice(i + 2, j));
  }
  for (const m of text.matchAll(/`([^`]*)`/g)) found.push(m[1]);
  return found;
}

const SHELL_C =
  /(?:^|[^\w.-])(?:sh|bash|zsh|dash|ksh)\s+(?:-[A-Za-z-]+\s+)*?-[A-Za-z]*c[A-Za-z]*\s+(?:'([^']*)'|"((?:[^"\\]|\\.)*)")/g;
const EVAL = /(?:^|[^\w.-])eval\s+(?:'([^']*)'|"((?:[^"\\]|\\.)*)")/g;

/** The quoted script of each `sh -c`, `bash -c`, `zsh -c`, and `eval` in `text`. */
export const scripts = (text) =>
  [...text.matchAll(SHELL_C), ...text.matchAll(EVAL)].map(
    (m) => m[1] ?? m[2].replace(/\\(.)/g, "$1"),
  );

/** True when `text` defines a function or has a `case`, where the order of execution is not the order of the text. */
export const reorders = (text) =>
  /(?:^|[\s;&|({])(?:function\s+\w+|\w+\s*\(\s*\)|case\s)/.test(text);

const DIR_CHANGERS = new Set(["cd", "pushd", "popd"]);

/** True when `command` is a command that changes the working directory. */
export const changesDir = (command) => DIR_CHANGERS.has(command);

/** True when `text` has a command that changes the working directory. */
export const hasDirChange = (text) =>
  /(?:^|[\s;&|({])(?:cd|pushd|popd)(?:\s|$|;)/.test(text);

/** True when `target` is a path form whose value the guard cannot know (`~name`, `~+`, brace expansion). */
export const unknownPath = (target) =>
  /^~[^/]/.test(target) || /[{}]/.test(target);

/** True when `target` names an absolute place, so a change of directory does not move it. */
export const fixedPath = (target) =>
  target.startsWith("/") || target === "~" || target.startsWith("~/");
