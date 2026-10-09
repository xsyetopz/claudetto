// The shell variables of one command that the guard can resolve to the temp root (design D28).
// The guard cannot run the shell, so it reads only two forms of value:
// `$(mktemp -d)` and a path under `$TMPDIR`, each with an optional plain rest.
// Each other value stays unresolved, and the caller asks.

const VALUE =
  /^(?:"[^"]*"|'[^']*'|\$\([^)]*\)|`[^`]*`|\$\{\w+\}|\$\w+|[^\s"'`$])+/;
const LEAD =
  /^\s*(?:(?:do|then|else|elif|if|while|until|time)(?=\s|$)|[!{(])\s*/;
const ASSIGN = /^\s*(?:(?:export|local|declare)\s+)?(\w+)=/;

/** A resolved path stays under the temp root, so these marks show an unsafe rest. */
const plain = (rest, glob = false) =>
  !(glob ? /[$`\\]/ : /[$`\\*?[]/).test(rest) &&
  !rest.split("/").includes("..");

/** True when `args` is a `mktemp` that makes a folder in the temp root. */
function tempFolder(args) {
  const flags = args.filter((a) => a.startsWith("-"));
  const names = args.filter((a) => !a.startsWith("-"));
  if (flags.some((f) => !["-d", "-t", "--directory"].includes(f))) return false;
  if (!flags.some((f) => f === "-d" || f === "--directory")) return false;
  return (
    names.length === 0 ||
    (flags.includes("-t") && names.every((n) => !n.includes("/")))
  );
}

/**
 * The path of the value `text` as a path under `base`, or undefined.
 * `known` maps the names of the resolved variables to their paths.
 */
export function resolveValue(text, base, known) {
  const unquoted = text.replace(/^"(.*)"$/s, "$1");
  const sub = unquoted.match(/^(?:\$\(([^()]*)\)|`([^`]*)`)(.*)$/s);
  if (sub) {
    const args = (sub[1] ?? sub[2]).trim().split(/\s+/);
    if (args[0] !== "mktemp" || !tempFolder(args.slice(1))) return undefined;
    const rest = sub[3];
    return (rest === "" || rest.startsWith("/")) && plain(rest)
      ? `${base}/mktemp${rest}`
      : undefined;
  }
  const ref = unquoted.match(/^\$(?:\{(\w+)\}|(\w+))(.*)$/s);
  if (!ref) return undefined;
  const name = ref[1] ?? ref[2];
  const rest = ref[3];
  if (rest !== "" && !rest.startsWith("/")) return undefined;
  if (!plain(rest) || !(name in known)) return undefined;
  return `${known[name]}${rest}`;
}

/**
 * Reads the assignments at the start of `segment` into `known`.
 * `state.taint` becomes true when the segment sets `TMPDIR`, because `$TMPDIR` then has an unknown value.
 * Only a segment of assignments with no command keeps its variables.
 * Returns true when the segment is only assignments.
 */
export function readAssignments(segment, base, known, state) {
  let rest = segment;
  const found = [];
  for (let m = rest.match(ASSIGN); m; m = rest.match(ASSIGN)) {
    rest = rest.slice(m[0].length);
    const value = rest.match(VALUE)?.[0] ?? "";
    rest = rest.slice(value.length);
    found.push([m[1], value]);
  }
  const only = rest.trim() === "";
  for (const [name, value] of found) {
    if (name === "TMPDIR") state.taint = true;
    if (!only) continue;
    const path =
      name === "TMPDIR" ? undefined : resolveValue(value, base, known);
    if (path) known[name] = path;
    else delete known[name];
  }
  return only;
}

/**
 * Forgets each name that `segment` sets as `NAME=` in a place that `readAssignments` does not read,
 * for example after `case a in a)`, inside `f() { ...; }`, or as `NAME=${NAME:0:1}x` with a command.
 * Call it for a segment that is not only plain assignments that resolved.
 */
export function forgetAssigned(segment, known, state) {
  for (const m of segment.matchAll(/(\w+)(?:\[[^\]]*\])?\+?=/g)) {
    if (m[1] === "TMPDIR") state.taint = true;
    delete known[m[1]];
  }
}

/** The target `text` with its leading variable replaced, or the same text when it has none. */
export function expandTarget(text, known) {
  const ref = text.match(/^\$(?:\{(\w+)\}|(\w+))(.*)$/s);
  if (!ref) return text;
  const name = ref[1] ?? ref[2];
  const rest = ref[3];
  if (
    (rest !== "" && !rest.startsWith("/")) ||
    !plain(rest, true) ||
    !(name in known)
  )
    return text;
  return `${known[name]}${rest}`;
}

/** The segment without the leading shell keywords and marks (`do`, `then`, `{`, `(`, `!`, `time`), and without a closing `)`. */
export function stripLead(segment) {
  let rest = segment.trimStart();
  for (let m = rest.match(LEAD); m; m = rest.match(LEAD))
    rest = rest.slice(m[0].length);
  // A closing `)` that has no `(` in the segment ends a subshell, and a `$(...)` keeps its own.
  rest = rest.trimEnd();
  let extra =
    (rest.match(/\)/g) ?? []).length - (rest.match(/\(/g) ?? []).length;
  while (extra-- > 0 && rest.endsWith(")")) rest = rest.slice(0, -1).trimEnd();
  return rest;
}

const DECLARERS = new Set([
  "export",
  "local",
  "declare",
  "typeset",
  "readonly",
]);

/** The names that the builtin `head` of `args` can set in a form other than a plain `NAME=value`, or "all" when they are unknown. */
function setNames(head, args) {
  const names = args.filter((a) => !a.startsWith("-"));
  const bare = (a) => a.replace(/^["']/, "").match(/^\w+/)?.[0];
  switch (head) {
    case "eval":
    case "source":
    case ".":
      return "all";
    case "read":
    case "mapfile":
    case "readarray":
    case "unset":
      return names.map(bare);
    case "let":
      return args.map(bare);
    case "printf": {
      const i = args.findIndex((a) => a.startsWith("-v"));
      return i < 0 ? [] : [args[i].slice(2) || args[i + 1]];
    }
    default:
      if (!DECLARERS.has(head)) return [];
      // A plain `export NAME=value` stays with `readAssignments`, which reads the value.
      return args.some((a) => a.startsWith("-"))
        ? names.map(bare)
        : names.filter((a) => !a.includes("=")).map(bare);
  }
}

/**
 * Forgets each resolved variable that `segment` can set in a form other than a plain `NAME=value`.
 * The forms are `read`, `NAME+=`, `NAME[i]=`, `eval`, `source`, `printf -v`, `for NAME in`, `mapfile`, `readarray`,
 * `declare`, `export`, `local`, `typeset`, `readonly` with a flag or with no value, `let`, and `unset`.
 * A forgotten variable is unresolved, so the `rm` rule asks.
 * A forgotten `TMPDIR` sets `state.taint`, because `$TMPDIR` then has an unknown value.
 * `segment` has no leading keyword (see `stripLead`).
 */
export function forgetSetters(segment, known, state) {
  const forget = (name) => {
    if (name === "TMPDIR") state.taint = true;
    delete known[name];
  };
  const words = segment.trim().split(/\s+/);
  for (const m of segment.matchAll(/(?:^|\s)["']?(\w+)(?:\[[^\]]*\])?\+?=/g))
    if (m[0].includes("+=") || m[0].includes("[")) forget(m[1]);
  const loop = segment.match(/^(?:for|select)\s+(\w+)\s+in\b/);
  if (loop) forget(loop[1]);
  while (words.length && /^\w+=/.test(words[0])) words.shift();
  const names = setNames(words[0]?.replace(/^.*\//, ""), words.slice(1));
  if (names === "all") {
    for (const name of Object.keys(known)) forget(name);
    state.taint = true;
    return;
  }
  for (const name of names) if (name) forget(name);
}
