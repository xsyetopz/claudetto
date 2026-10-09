// The rules of the unbounded-output deny: a `Bash` command whose output has no bound gets the bounded form.
// Each line of a `Bash` result stays in the context for the rest of the session, so a read with no limit costs each later turn.
// The functions are pure and read no file. A form that they cannot read stays allowed.

import { pipelines, stageWords } from "./split.mjs";

/** The commands that print a file, a tree, or a history with no limit when they read it themselves. */
const PRODUCERS = new Set([
  "cat",
  "jq",
  "yq",
  "grep",
  "egrep",
  "fgrep",
  "rg",
  "ag",
  "awk",
  "sed",
  "sort",
  "uniq",
  "nl",
  "find",
  "fd",
  "tree",
  "strings",
  "xxd",
  "hexdump",
  "od",
  "diff",
  "curl",
]);

/** The commands that pass their input on with no bound. After a pipe, the bound depends on the stage before. */
const FILTERS = new Set([
  ...PRODUCERS,
  "cut",
  "tr",
  "column",
  "tee",
  "fold",
  "paste",
  "rev",
  "fmt",
]);

/** The commands whose output is bounded, whatever their input is. */
const BOUNDERS = new Set(["head", "tail", "wc"]);

const GIT_UNBOUNDED = new Set(["log", "diff", "show", "blame", "grep"]);
const DIFF_BOUNDS =
  /^(?:--stat(?:=.*)?|--shortstat|--numstat|--name-only|--name-status|--quiet|--exit-code)$/;
/** The options that bound the output of each `git` subcommand. */
const GIT_BOUNDS = {
  log: /^(?:-n\d*|-\d+|--max-count(?:=.*)?)$/,
  diff: DIFF_BOUNDS,
  show: new RegExp(`${DIFF_BOUNDS.source}|^(?:-s|--no-patch)$`),
  blame: /^-L.+$|^-L$/,
  grep: /^(?:-[A-Za-z]*[clqm][A-Za-z0-9]*|--count|--files-with-matches|--quiet|--max-count(?:=.*)?)$/,
};
/** The global options of `git` that take a separate value. */
const GIT_VALUE_OPTS = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--exec-path",
]);
const GREP_BOUNDS =
  /^(?:-[A-Za-z]*[clLqm][A-Za-z0-9]*|--count|--files-with-matches|--files-without-match|--quiet|--silent|--max-count(?:=.*)?)$/;
// A line is a number or a shell variable (`${l}`), and ranges can be joined with `;`.
const LINE = String.raw`(?:\d+|\$\{?\w+\}?|\$)`;
const SED_RANGE = new RegExp(
  String.raw`^(?:${LINE}(?:,${LINE})?p(?:;${LINE}(?:,${LINE})?p)*;?|\d+q)$`,
);
const CURL_FILE =
  /^(?:-[A-Za-z]*[oOI][A-Za-z]*|--output(?:=.*)?|--remote-name|--head)$/;
/** The option of each dump command that bounds the bytes it reads. */
const DUMP_BOUNDS = {
  xxd: /^-l(?:en)?\d*$/,
  od: /^(?:-N\d*|--read-bytes(?:=.*)?)$/,
  hexdump: /^-n\d*$/,
};
/** A `jq` filter that prints one value, or that counts or slices, gives a bounded output. */
const JQ_BOUNDED =
  /\b(?:length|keys|first|last|limit|add|any|all|min|max|type|has)\b|\[\s*-?\d*\s*:\s*-?\d+\s*\]/;
/** The `jq` options that take a separate value, or two. */
const JQ_VALUE_OPTS = {
  "--arg": 2,
  "--argjson": 2,
  "--slurpfile": 2,
  "--rawfile": 2,
  "--indent": 1,
  "-f": 1,
  "--from-file": 1,
};

const PREFIXES = new Set([
  "sudo",
  "time",
  "nice",
  "nohup",
  "command",
  "builtin",
  "exec",
]);
/** The shell words that can start a segment before its command. */
const KEYWORDS = new Set([
  "if",
  "then",
  "else",
  "elif",
  "while",
  "until",
  "do",
  "!",
  "{",
  "(",
]);

/** The argv of a stage after the prefix commands and `VAR=value` words, with `xargs` marked. */
function argvOf(words) {
  const rest = [...words];
  let xargs = false;
  while (rest.length) {
    const head = rest[0].replace(/^.*\//, "");
    if (
      /^\w+=/.test(rest[0]) ||
      PREFIXES.has(head) ||
      KEYWORDS.has(rest[0]) ||
      head === "env"
    )
      rest.shift();
    else if (rest[0].startsWith("(")) rest[0] = rest[0].slice(1);
    else if (head === "timeout") {
      rest.shift();
      while (rest[0]?.startsWith("-")) rest.shift();
      rest.shift();
    } else if (head === "xargs") {
      xargs = true;
      rest.shift();
      while (rest[0]?.startsWith("-")) rest.shift();
    } else break;
    while (rest[0]?.startsWith("-") && PREFIXES.has(head)) rest.shift();
  }
  return { argv: rest, xargs };
}

/**
 * True when the stage sends its standard output to a file, also with no space (`grep x f>out`).
 * Quoted text is blanked first, so a quoted `>` is not a redirect.
 */
function toFile(stage) {
  const text = stage.replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, "''");
  for (const m of text.matchAll(/(^|[^>])(&?>>?)(?!&|\()\s*([^\s|&;<>]*)/g)) {
    const at = m.index + m[1].length;
    // `2>` is the error output, and only a `2` that starts a word is a file descriptor.
    if (
      m[2] !== "&>" &&
      text[at - 1] === "2" &&
      !/\S/.test(text[at - 2] ?? " ")
    )
      continue;
    if (!m[3] || /^\/dev\/(?:stdout|stderr|tty)$/.test(m[3])) continue;
    return true;
  }
  return false;
}

/** The kind of a `jq` or `yq` stage: a filter of one value is bounded. */
function jqKind(name, args, first) {
  let filter;
  for (let i = 0; i < args.length; i++) {
    if (JQ_VALUE_OPTS[args[i]]) i += JQ_VALUE_OPTS[args[i]];
    else if (!args[i].startsWith("-") || args[i] === "-") {
      filter = args[i];
      break;
    }
  }
  const all = filter === undefined || /^\s*\.\s*$|\[\]|\.\./.test(filter);
  if (!all || JQ_BOUNDED.test(filter)) return { type: "bounded" };
  return first ? { type: "producer", name } : { type: "filter", name };
}

/** The kind of a `find` stage: a stage that only deletes or runs a command that is not a read prints nothing. */
function findKind(args, first) {
  if (args.includes("-delete") || args.includes("-quit"))
    return { type: "bounded" };
  const exec = args.findIndex((a) => /^-(?:exec|execdir|ok|okdir)$/.test(a));
  if (exec >= 0) {
    // The command of `-exec` decides, such as `grep -l x {} +`, which is bounded.
    const end = args.findIndex((a, i) => i > exec && (a === ";" || a === "+"));
    const run = kind(
      args.slice(exec + 1, end < 0 ? undefined : end).join(" "),
      true,
    );
    if (run.type !== "producer")
      return { type: run.type === "bounded" ? "bounded" : "other" };
  }
  return first
    ? { type: "producer", name: "find" }
    : { type: "filter", name: "find" };
}

/** The kind of one stage: `bounded`, `filter`, `producer` (with its command name), or `other`. */
export function kind(stage, first) {
  if (toFile(stage)) return { type: "bounded" };
  const words = stageWords(stage);
  const heredoc = stage.includes("\0heredoc");
  const { argv, xargs } = argvOf(words.filter((w) => !w.includes("\0")));
  const name = (argv[0] ?? "").replace(/^.*\//, "");
  const args = argv.slice(1);
  if (BOUNDERS.has(name)) return { type: "bounded" };
  if (name === "git") {
    // The global options `-C dir` and `-c key=value` come before the subcommand.
    let at = 0;
    while (args[at]?.startsWith("-"))
      at += GIT_VALUE_OPTS.has(args[at]) ? 2 : 1;
    const sub = args[at];
    if (!GIT_UNBOUNDED.has(sub)) return { type: "other" };
    if (args.slice(at + 1).some((a) => GIT_BOUNDS[sub].test(a)))
      return { type: "bounded" };
    // `git show REV:path` prints one file, which `Read` gives with a range.
    return { type: "producer", name: `git ${sub}` };
  }
  if (name === "ls")
    return args.some((a) => /^-[A-Za-z]*R/.test(a) || a === "--recursive")
      ? { type: "producer", name: "ls -R" }
      : { type: "other" };
  if (!FILTERS.has(name)) return { type: "other" };
  if (heredoc) return { type: "bounded" };
  if (name === "jq" || name === "yq") return jqKind(name, args, first || xargs);
  if (name === "find" || name === "fd") return findKind(args, first || xargs);
  // An `awk` program with only an `END` block prints a summary.
  if (
    name === "awk" &&
    /^\s*END\s*\{/.test(args.find((a) => !a.startsWith("-")) ?? "")
  )
    return { type: "bounded" };
  if (
    /^(?:grep|egrep|fgrep|rg|ag)$/.test(name) &&
    args.some((a) => GREP_BOUNDS.test(a))
  )
    return { type: "bounded" };
  if (name === "sed") {
    if (args.some((a) => /^-[A-Za-z]*i/.test(a) || a.startsWith("--in-place")))
      return { type: "other" };
    if (args.some((a) => SED_RANGE.test(a))) return { type: "bounded" };
  }
  if (name === "curl" && args.some((a) => CURL_FILE.test(a)))
    return { type: "bounded" };
  if (
    name === "diff" &&
    args.some((a) => /^(?:-[A-Za-z]*q[A-Za-z]*|--brief|--stat)$/.test(a))
  )
    return { type: "bounded" };
  if (DUMP_BOUNDS[name] && args.some((a) => DUMP_BOUNDS[name].test(a)))
    return { type: "bounded" };
  if ((first || xargs) && PRODUCERS.has(name))
    return { type: "producer", name };
  if (!first && /\s<\s*[^<\s]/.test(stage) && PRODUCERS.has(name))
    return { type: "producer", name };
  return { type: "filter", name };
}

/** The name of the command that makes the output of `command` unbounded, or null. */
export function unbounded(command) {
  if (groupBounded(command)) return null;
  for (const stages of pipelines(command)) {
    for (let i = stages.length - 1; i >= 0; i--) {
      const k = kind(stages[i], i === 0);
      if (k.type === "bounded" || k.type === "other") break;
      if (k.type === "producer") return k.name;
    }
  }
  return null;
}

/**
 * True when a group or a loop (`( )`, `{ }`, `done`, `fi`, `esac`) ends in a pipe or a redirect that bounds it,
 * such as `for f in *; do cat $f; done | head -n 20`.
 * The split does not read groups, so the text after the last closer decides for the whole command.
 */
function groupBounded(command) {
  const text = String(command).replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, "''");
  const closers = [
    ...text.matchAll(
      /(?:\bdone|\bfi|\besac|\}|(?<!\$\([^()]*)\))(?=\s*(?:<\s*\S+\s*)?(?:[|>]|\d>|&>))/g,
    ),
  ];
  const last = closers.at(-1);
  if (!last) return false;
  const [stages] = pipelines(`true${text.slice(last.index + last[0].length)}`);
  return (stages ?? []).some(
    (stage, i) => kind(stage, i === 0).type === "bounded",
  );
}
