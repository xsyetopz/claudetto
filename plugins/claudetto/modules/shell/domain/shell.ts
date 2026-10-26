// The one shell reader of claudetto, for the guards. It cannot run the shell, so it reads only the syntax that decides which command runs:
// words, quotes, the operators between simple commands, nested scripts, and the wrapper commands.
// The scan is in `shell/scan.ts`, the word splitter is in `wrappers.ts`, and the kinds of command are in `shellkinds.ts`.

import {
  ALIAS_DEPTH_MAX,
  SHELL_SCAN_MAX_CHARS,
  SHELL_VARIANTS_MAX,
} from "../limits.ts";
import {
  type Aliases,
  envAliases,
  envRuns,
  expandAlias,
  gitHead,
  isGitEnv,
} from "./git.ts";
import {
  assign,
  fillArgs,
  markDrift,
  mask,
  noteUses,
  resolve,
  scriptTexts,
  type Uses,
  unmask,
  type Vars,
  valuesOf,
} from "./resolve.ts";
import { type Lits, type Spots, scan, UNREAD } from "./scan.ts";
import {
  bodyKind,
  hiddenLevel,
  readsScript,
  runsCode,
  scriptOf,
} from "./shellkinds.ts";
import { stripWrappers } from "./wrappers.ts";

/** A text that `parse` scans later, with the words of its heredoc when it has one. `aliases` (those of `-c` and the env, and not those of the config files) and `depth` are set for the text that an alias runs. `lone` is true for a text that is one plain `git` call. */
type Queued = {
  text: string;
  body: boolean;
  aliases?: Aliases | undefined;
  depth?: number;
  lone?: boolean;
};

/** True when `text` can hold only one command, with no other command, no redirect, no substitution, no quote escape, and no group: the text has none of `;&|()<>`, a backquote, `$`, a backslash, braces, or a line break. */
const oneCommand = (text: string): boolean => !/[;&|()<>`$\\{}\r\n]/.test(text);

/**
 * What the gate knows of `git` outside the text: the aliases of the config, and the commands (`git --list-cmds=main,others`), both for the folder of the session.
 * They are known only for a lone call: the whole text is one plain `git` call, with no env prefix, no wrapper, no other command, no redirect, and no option that changes the config files (`-C`, `-c` for a key other than `alias.X`, `--config-env`, `--git-dir`, `--work-tree`, `--exec-path`).
 * Each other text reads only the `builtins`, because another command, a `cd`, or a file write may change which config files `git` reads. With no `builtins`, it is `commands`.
 */
export type GitFacts = {
  aliases: Aliases;
  commands: ReadonlySet<string>;
  builtins?: ReadonlySet<string>;
};

/** True when `verb` is a command of `git` that the gate knows: any command for a lone call (`lone`), else a built-in. With no `git` facts, each verb is known. */
const knownVerb = (
  git: GitFacts | undefined,
  lone: boolean,
  verb: string,
): boolean =>
  git === undefined ||
  (lone ? git.commands : (git.builtins ?? git.commands)).has(verb);

type Held = Queued & { outs: string[] };

type Redirect = { op: string; target: string };

type ParseResult = {
  commands: string[][];
  redirects: Redirect[];
  code: string[];
  background: string[][];
  /** The commands of `commands` (the same arrays) with a word that still holds a `$` that no value filled, such as `$f` for a variable that nothing assigned. A plain `$` (in single quotes or after a backslash) is no such word. */
  opaque: Set<string[]>;
  truncated: boolean;
  /** True when the text runs a program, a script, or a `git` verb that the reader cannot name. */
  unknown: boolean;
  /** True when the verb of a lone `git` call is no alias and no command of `git.commands`, so `unknown` is true: the gate may read more facts and parse again. */
  unknownVerb: boolean;
  /** True when a `git` call has a `-c` or `--config-env` key, a `GIT_CONFIG_*` entry, or a program variable (`GIT_PAGER`, `EDITOR`, ...) that can make `git` run a program, also for a built-in verb. */
  gitProgram: boolean;
};

/**
 * The simple commands of `text` as lists of words, and whether the scan stopped at `SHELL_SCAN_MAX_CHARS`.
 * A command ends at `;`, `&&`, `||`, `|`, `&`, a newline, or a parenthesis.
 * Redirections, comments, quoted heredoc bodies, and the reserved words before a command (`if`, `then`, `{`, `!`) are not in the list.
 * The commands inside `$(...)`, backticks, an unquoted heredoc, `sh -c '...'`, `bash -c`, and `eval` are in the list too.
 * Each `$NAME` of a program word is replaced by each literal value that the text may have assigned to `NAME` (`resolve.ts`), so the list has a command for each value.
 * The script of `sh -c` and `eval` is filled in the same way.
 * `unknown` is true for a part that has no known value, a script with a substitution, a `git` verb that is no alias and no command, and an alias chain over `ALIAS_DEPTH_MAX`.
 * A `git` call with an alias verb (`-c alias.X=...`, `GIT_CONFIG_*`, `git config alias.X ...`, or `git.aliases`) adds the command that the alias runs.
 * A wrapper such as `sudo` stays in front of its command: `stripWrappers` removes it.
 * The commands of a quoted heredoc or a here-string are in the list when a shell reads it (`bash <<'EOF'`), or when the text runs a script that the reader cannot see (`hiddenLevel`).
 * `code` lists each text that a program other than the shell can run as code (`runsCode`):
 * a heredoc body or a here-string that it reads, an argument with a space, a bracket, or a `;` (`python3 -c '...'`),
 * and a heredoc body that a data command writes to a file that such a program names, or to its standard output when the text runs such a program.
 * `redirects` lists the operator and the target word of each output redirection (`>`, `>>`, `>|`), except a file descriptor such as the `1` of `2>&1`.
 * `background` lists the words of each command that a lone `&` puts in the background.
 * `opaque` holds each command with a word that has a `$` that no value filled.
 */
export const parse = (text: unknown, git?: GitFacts): ParseResult => {
  const result: ParseResult = {
    commands: [],
    redirects: [],
    code: [],
    background: [],
    opaque: new Set(),
    truncated: false,
    unknown: false,
    unknownVerb: false,
    gitProgram: false,
  };
  const { commands: out, redirects, code, background } = result;
  const first = String(text ?? "");
  const queue: Queued[] = [
    { text: first, body: false, lone: oneCommand(first) },
  ];
  const seen = new Set<string>();
  const held: { feed: Held[]; data: Held[] } = { feed: [], data: [] };
  let scanned = 0;
  let hidden = 0;
  const vars: Vars = new Map();
  const uses: Uses = new Map();
  let current: Queued | undefined;
  const later = (
    t: string,
    body = false,
    alias?: { aliases: Aliases; depth: number; lone: boolean },
  ) => queue.push({ text: t, body, ...alias });
  const redirect = (op: string, target: string, line: string[]) => {
    if (op.startsWith(">") && !/^(?:\d+|-)$/.test(target))
      redirects.push({ op, target });
    if (op !== "<<<") return;
    if (readsScript(line)) later(target);
    else if (runsCode(line)) code.push(target);
  };
  const heredoc = (
    doc: string,
    quoted: boolean,
    head: string[],
    outs: string[],
  ) => {
    // The shell expands an unquoted body, so its substitutions run.
    if (!quoted) later(doc, true);
    const kind = bodyKind(head);
    if (kind === "script") later(doc);
    else if (kind === "code") code.push(doc);
    else held[kind].push({ text: doc, body: false, outs });
  };
  /** The words of the env that the `git` call `argv` reads for its aliases and programs: the known `GIT_CONFIG_*` and program variables, and the assignments before the program. */
  const gitEnv = (argv: string[]): Map<string, string> => {
    const env = new Map<string, string>();
    for (const name of vars.keys()) {
      const found = valuesOf(vars, name);
      if (!isGitEnv(name)) continue;
      if (found.length === 1 && found[0] !== undefined) env.set(name, found[0]);
      else result.unknown = true;
    }
    for (const w of argv.slice(0, argv.length - stripWrappers(argv).length)) {
      const m = /^(\w+)=(.*)$/s.exec(w);
      if (m && isGitEnv(m[1] as string))
        env.set(m[1] as string, m[2] as string);
    }
    return env;
  };
  /** Marks a lone `git` call whose verb is no alias and no command as unknown, and a call that is not lone with a verb that is no built-in. */
  const markVerb = (verb: string, lone: boolean) => {
    if (knownVerb(git, lone, verb)) return;
    result.unknown = true;
    // The gate reads more facts only for a call that could use them.
    result.unknownVerb ||= lone;
  };
  /** Queues the command that the alias of a `git` call runs, and marks a verb that is no alias and no command as unknown. The aliases and the commands of the config are known only for a lone call: a plain `git` call that is the whole text, or the whole text that the alias of such a call runs. */
  const gitStep = (argv: string[]) => {
    const head = gitHead(argv);
    if (head === undefined) return;
    const lone = (current?.lone ?? false) && head.plain;
    const env = gitEnv(argv);
    result.gitProgram = [result.gitProgram, head.runs, envRuns(env)].some(
      Boolean,
    );
    const explicit = new Map([
      ...(current?.aliases ?? []),
      ...envAliases(env),
      ...head.aliases,
    ]);
    const known = lone
      ? new Map([...(git?.aliases ?? []), ...explicit])
      : explicit;
    const text = expandAlias(head, known);
    if (text === undefined) return markVerb(head.verb, lone);
    const depth = (current?.depth ?? 0) + 1;
    if (depth > ALIAS_DEPTH_MAX) result.unknown = true;
    else
      later(text, false, {
        aliases: explicit,
        depth,
        lone: lone && oneCommand(text),
      });
  };
  /** Queues the script of `sh -c` or `eval` with each value of its variables. */
  const scriptStep = (argv: string[], script: string | undefined) => {
    // A bare `eval` has no script.
    if (
      script === undefined ||
      (script === "" && stripWrappers(argv).length < 2)
    )
      return;
    const filled = scriptTexts(script, vars);
    if (filled.unknown) result.unknown = true;
    for (const t of filled.texts) if (t) later(t);
  };
  const emit = (line: string[], plain: boolean, spots: Spots, lits: Lits) => {
    // A plain `$` (in single quotes or after a backslash) is masked while the names are filled, and the words of the command have it back.
    const masked = line.map((w, i) => mask(w, lits[i]));
    const args = fillArgs(masked, vars, spots);
    const resolved = args.argvs.map((a) => resolve(a, vars));
    const all = resolved.flatMap((r) => r.argvs);
    // More programs than the bound are unreadable.
    const over = all.length > SHELL_VARIANTS_MAX;
    const argvs = over ? [masked] : all;
    if (
      args.unknown ||
      over ||
      resolved.some((r) => r.unknown) ||
      spots.some((s) => s?.includes(UNREAD))
    )
      result.unknown = true;
    // A command that may not run, or that has more than one program, adds values and replaces none.
    // A read in a loop or a function sees each value that the name gets anywhere, so `drifted` checks it after the scan.
    noteUses(masked, vars, uses, plain);
    const sure = plain && current === queue[0] && argvs.length === 1;
    for (const marked of argvs) {
      assign(marked, vars, sure);
      const argv = marked.map(unmask);
      out.push(argv);
      if (marked.some((w) => w.includes("$"))) result.opaque.add(argv);
      gitStep(argv);
      const script = scriptOf(argv);
      scriptStep(argv, script);
      hidden = Math.max(hidden, hiddenLevel(argv, script));
      if (runsCode(argv))
        code.push(
          ...stripWrappers(argv)
            .slice(1)
            .filter((w) => /[\s(){};]/.test(w)),
        );
    }
  };
  /** Queues the held bodies that `hidden` can run. True when it queued one. */
  const release = () => {
    const ready = [
      ...(hidden > 0 ? held.feed.splice(0) : []),
      ...(hidden > 1 ? held.data.splice(0) : []),
    ];
    queue.push(...ready);
    return ready.length > 0;
  };
  for (let n = 0; n < queue.length || release(); n++) {
    const { text: next, body, aliases, depth, lone } = queue[n] as Queued;
    const key = `${body}:${depth ?? 0}:${lone}:${JSON.stringify([...(aliases ?? [])])}:${next}`;
    if (seen.has(key)) continue;
    seen.add(key);
    current = queue[n];
    scanned += next.length;
    if (scanned > SHELL_SCAN_MAX_CHARS) return { ...result, truncated: true };
    scan(next, emit, body, redirect, heredoc, (line) => background.push(line));
  }
  markDrift(uses, vars, result);
  // A data body is code when a program reads the file that it is written to, or its standard output.
  const programs = out.filter(runsCode);
  for (const { text: doc, outs } of held.data)
    if (
      outs.length
        ? outs.some((t) => programs.some((argv) => argv.includes(t)))
        : programs.length > 0
    )
      code.push(doc);
  return result;
};

export const commands = (text: unknown): string[][] => parse(text).commands;
