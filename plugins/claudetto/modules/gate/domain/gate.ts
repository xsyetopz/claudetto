// The permission gate (spec `permission-gate`, D4): it stops only a call that loses bytes for good, tampers with the system, or reads a secret.
// The function is pure except for `Facts.git` and `Facts.userEdits`, which the adapter runs and a test stubs.

import { GLOB_FIELD } from "../../session/index.ts";
import {
  baseName,
  nameOf,
  operands,
  parse,
  readsScript,
  scriptOf,
  stripWrappers,
  wordSet,
} from "../../shell/index.ts";
import { GIT_COMMON_COMMANDS } from "../limits.ts";
import * as T from "../prompts.ts";
import {
  bulkStage,
  DELETES,
  deleteTargets,
  erasesDisk,
  type GitScope,
  gitCall,
  isDbFile,
  localLoss,
  lossKind,
  remoteRewrite,
  wholeTree,
} from "./loss.ts";
import {
  codeSecret,
  globsSecret,
  inTmp,
  isSystem,
  namesSecret,
  type Places,
  pathOf,
} from "./paths.ts";

/** The `git` facts of the project: the aliases of its config (`git config --get-regexp '^alias\.'`) and its commands (`git --list-cmds=main,others`). */
export type GitConfig = {
  aliases: Readonly<Record<string, string>>;
  commands: readonly string[];
};

/** The folders of the session, `hasEnvFile` (true when the project has an env file, or when the adapter cannot tell; a gate with no `hasEnvFile` counts it as true), `git` (`"clean"` when the files of `paths` in `scope` have a commit and no change), `userEdits` (the changed files of `dir` that the edit ledger does not know), and `gitConfig` (the `git` facts, or `undefined` when `git` cannot give them; a gate with no `gitConfig` uses `GIT_COMMON_COMMANDS`). */
export type Facts = Places & {
  gitConfig?: () => Promise<GitConfig | undefined>;
  hasEnvFile?: () => Promise<boolean>;
  git: (
    scope: GitScope,
    dir: string,
    paths: string[],
  ) => Promise<"clean" | "dirty">;
  userEdits: (dir: string) => Promise<string[]>;
};

/** An `ask` with `jev` comes only from the delete and local `git` gates (D4). A `secret` verdict gives no `!` command in its reason. */
export type Verdict = {
  decision: "allow" | "ask" | "deny";
  reason?: string;
  jev?: true;
  secret?: true;
};

/** A verdict, or a check that runs `git` or reads the ledger, and gives an `ask` or `undefined`. */
type Finding = Verdict | (() => Promise<Verdict | undefined>);

const JEV = { jev: true } as const;
const verdict = (
  decision: Verdict["decision"],
  reason: string,
  flags: { jev?: true; secret?: true } = {},
): Verdict => ({ decision, reason, ...flags });
const denySecret = (word: string): Verdict =>
  verdict("deny", T.DENY_SECRET({ word }), { secret: true });
const LOSS = {
  db: verdict("ask", T.ASK_DB_LOSS, JEV),
  infra: verdict("ask", T.ASK_INFRA_LOSS),
};
const PIPED = wordSet("xargs parallel");
const ROOT_USERS = wordSet("sudo doas su");
const DOWNLOADS = wordSet("curl wget");
/** The commands that take a secret path as a name only: none of them prints, copies, links, or sends the content of a file. */
const NO_READ = wordSet(
  "echo printf ls test [ touch stat rm unlink chmod chown",
);
/** The commands that copy or link their source operands: each operand but the last, or each operand when `-t` names the target. */
const COPIES = wordSet("cp mv ln");
const TARGET_OPT = /^(?:--target-directory(?:=|$)|-[A-Za-z]*t)/;
/** The commands whose first operand is a pattern or a script, not a file. */
const PATTERNED = wordSet("grep egrep fgrep rg ugrep sed awk");
/** A substitution with a quoted heredoc that holds only text: `$(cat <<'EOF'`, the body, the first line of `EOF`, and `)`. The body has no line of the delimiter, because the shell ends the heredoc at the first one. The gate reads its value in full, and the shell runs nothing of the body. */
const LITERAL_DOC =
  /\$\(\s*cat\s+<<-?\s*(['"])(\w+)\1[ \t]*\n(?:(?!\t*\2\n)[^\n]*\n)*\t*\2\n\s*\)/g;
/** A `<` read (also `0<` and `<>`) and its target word. A `<<`, `<(`, and `<&` are no read of a file. */
const INPUT =
  /(?<!<)<(?![<(&])>?\s*((?:\$\([^)]*\)?|`[^`]*`?|'[^']*'|"[^"]*"|[^\s;&|<>()'"])*)/g;
const WRITES_ALL = new Set([
  ...wordSet("tee touch mkdir rmdir chmod chown chgrp truncate"),
  ...DELETES,
]);
const WRITES_LAST = wordSet("cp mv install rsync ditto ln");
/** The file of an upload word: `@f` of `curl -d @f`, `-d@f`, and `name=@f` or `name=<f` of `curl -F`. */
const UPLOAD = /^(?:-[A-Za-z]|[^=@<]*=)?[@<](.+)$/;

const systemWrite = (path: string | null): Verdict | undefined =>
  path !== null && isSystem(path)
    ? verdict("deny", T.DENY_SYSTEM_WRITE({ path }))
    : undefined;

const textOf = (input: Record<string, unknown>, key: string): string =>
  typeof input[key] === "string" ? (input[key] as string) : "";

const atRoot = (path: string | null, f: Facts): boolean =>
  path === "/" || path === f.home;

/** A delete asks when the gate cannot read its target or removes a database file outside the temp folder, and it is denied for the root or the home folder (D1). */
const deleteFindings = (
  targets: string[],
  dir: string | null,
  f: Facts,
): Verdict[] =>
  targets.flatMap((target) => {
    const path = dir === null ? null : pathOf(dir, target, f);
    if (path === null)
      return [verdict("ask", T.ASK_DELETE_UNREAD({ target }), JEV)];
    if (atRoot(path, f)) return [verdict("deny", T.DENY_ROOT({ target }))];
    return isDbFile(path) && !inTmp(path, f)
      ? [verdict("ask", T.ASK_DB_LOSS, JEV)]
      : [];
  });

const systemFinding = (
  argv: string[],
  rest: string[],
  f: Facts,
  dir: string,
): Verdict | undefined => {
  const name = nameOf(rest);
  const prefix = argv.slice(0, argv.length - rest.length);
  if (prefix.some((w) => ROOT_USERS.has(baseName(w))) || ROOT_USERS.has(name))
    return verdict("deny", T.DENY_ROOT_USER);
  if (erasesDisk(name, rest)) return verdict("deny", T.DENY_DISK);
  const all = WRITES_ALL.has(name);
  if (!all && !WRITES_LAST.has(name)) return undefined;
  const args = operands(rest.slice(1));
  const recursive = rest.some(
    (w) => w === "--recursive" || /^-[A-Za-z]*R/.test(w),
  );
  const target =
    /^ch(?:mod|own|grp)$/.test(name) && recursive
      ? args.find((t) => atRoot(pathOf(dir, t, f), f))
      : undefined;
  if (target !== undefined)
    return verdict("deny", T.DENY_ROOT_MODE({ target }));
  const written = all ? args : args.slice(-1);
  return written.map((w) => systemWrite(pathOf(dir, w, f))).find(Boolean);
};

/** A shell that runs a download from the network: `curl ... | sh`. */
const runsDownload = (commands: string[][]): boolean =>
  commands.some((argv) => DOWNLOADS.has(nameOf(argv))) &&
  commands.some((argv) => readsScript(argv) || scriptOf(argv) === "");

/** The finding of a `git` call: a push that rewrites the remote, or a local command that can lose work. */
const gitFinding = (
  argv: string[],
  f: Facts,
  dir: string | null,
): Finding | undefined => {
  const call = gitCall(argv);
  if (call === undefined) return undefined;
  if (remoteRewrite(call)) return verdict("ask", T.ASK_PUSH);
  const at = dir === null ? null : pathOf(dir, call.dir ?? ".", f);
  const bulk = bulkStage(call);
  if (bulk || wholeTree(call))
    return async () => {
      const files = await f.userEdits(at ?? f.cwd);
      const list = files.map((p) => `\`${p}\``).join(", ");
      return files.length > 0
        ? verdict(
            "ask",
            bulk
              ? T.ASK_BULK_STAGE({ files: list })
              : T.ASK_WHOLE_TREE({ verb: call.verb, files: list }),
          )
        : undefined;
    };
  const loss = localLoss(call);
  if (loss === undefined) return undefined;
  const found = verdict("ask", T.ASK_GIT_LOSS({ verb: call.verb }), JEV);
  if (loss === "always" || at === null) return found;
  return async () =>
    (await f.git(loss.scope, at, loss.paths)) === "dirty" ? found : undefined;
};

/** True when `word` names a secret file, or is a glob that can match one. */
const secretWord = (dir: string, word: string, f: Facts): boolean =>
  namesSecret(dir, word, f) || globsSecret(dir, word, f);

/** True when a word of a command, or a script of the text, names a secret file or a glob for one. */
const holdsSecret = (
  command: string,
  commands: string[][],
  f: Facts,
): boolean =>
  codeSecret(command) !== undefined ||
  commands.some((argv) => argv.some((w) => secretWord(f.cwd, w, f)));

/** An `ask` when the project has an env file, or when the adapter cannot tell. */
const envAsk =
  (f: Facts): Finding =>
  async () =>
    (await (f.hasEnvFile?.() ?? true))
      ? verdict("ask", T.ASK_ENV_FED)
      : undefined;

/** True when the text reads a file by `<` and the gate cannot read the target: it holds `$`, a backtick, or a glob character, or it is empty. */
const readsUnnamed = (text: string): boolean =>
  [...text.matchAll(INPUT)].some((m) => {
    const target = m[1] as string;
    return /[$`*?[]/.test(target) || target.replace(/['"]/g, "") === "";
  });

/**
 * A program whose file comes from `$(...)`, backticks, the input of `xargs`, or a variable with no known value reads a file that the gate cannot name.
 * It asks when the text holds a secret name.
 * Any other program asks also when the project has an env file, because the text may build the name of a file (`cat $(printf ".e%s" nv)`, `python3 $f`), unless the gate reads the operand in full.
 * An empty operand is unread when the text has `$` or a backtick outside the literal heredocs of `LITERAL_DOC`, as `git commit -m "$(cat <<'EOF'` does not.
 */
const fedFinding = (
  argv: string[],
  rest: string[],
  f: Facts,
  dir: string,
  named: { secret: boolean; subst: boolean; dynamic: boolean; opaque: boolean },
): Finding | undefined => {
  if (rest.length === 0 || NO_READ.has(nameOf(rest))) return undefined;
  const piped = argv.some((w) => PIPED.has(baseName(w)));
  const operands = rest.slice(1);
  const empty = named.subst && operands.includes("");
  if (named.secret && (piped || empty)) return verdict("ask", T.ASK_SECRET_FED);
  const unread = operands.some(
    (w) =>
      (w === "" && named.dynamic) ||
      (named.opaque && w.includes("$") && pathOf(dir, w, f) === null),
  );
  if (!(piped || unread)) return undefined;
  return envAsk(f);
};

/** The words of `rest` that a copy command reads: the destination, the last operand, is left out, because a write of a name reads nothing. */
const readWords = (name: string, rest: string[]): string[] => {
  if (!COPIES.has(name) || rest.some((w) => TARGET_OPT.test(w))) return rest;
  const args = operands(rest.slice(1));
  const at = args.length > 1 ? rest.lastIndexOf(args.at(-1) as string) : -1;
  return rest.filter((_, i) => i !== at);
};

/** A read of a secret file by name or by an upload word, or a print of each environment variable with a bare `env` or `printenv`. */
const secretFinding = (
  argv: string[],
  rest: string[],
  f: Facts,
  dir: string | null,
): Verdict | undefined => {
  const name = nameOf(rest);
  const bareEnv = rest.length === 0 && argv.some((w) => baseName(w) === "env");
  if (bareEnv || (name === "printenv" && operands(rest.slice(1)).length === 0))
    return verdict("deny", T.DENY_ENV_DUMP, { secret: true });
  if (NO_READ.has(name)) return undefined;
  const skip = PATTERNED.has(name) ? operands(rest.slice(1))[0] : undefined;
  const word = readWords(name, rest)
    .filter((w) => w !== skip)
    .flatMap((w) => [w, UPLOAD.exec(w)?.[1] ?? ""])
    .find((w) => w !== "" && secretWord(dir ?? f.cwd, w, f));
  return word === undefined ? undefined : denySecret(word);
};

/** The new folder of a `cd` or `pushd` command `rest`, `undefined` for another command, and `null` when the gate cannot read it. */
const nextDir = (
  rest: string[],
  dir: string | null,
  f: Facts,
): string | null | undefined => {
  const name = nameOf(rest);
  if (name !== "cd" && name !== "pushd") return undefined;
  const target = operands(rest.slice(1))[0];
  if (target === undefined) return f.home;
  return dir === null || target === "-" ? null : pathOf(dir, target, f);
};

/** A `git stash` (except `list` and `show`) or a `pkill -f` from a subagent, which changes the state of the main agent (X4). */
const sharedFinding = (argv: string[], rest: string[]): Verdict | undefined => {
  const call = gitCall(argv);
  const stash =
    call?.verb === "stash" && !["list", "show"].includes(call.args[0] ?? "");
  const pkill =
    nameOf(rest) === "pkill" &&
    rest.some((w) => w === "--full" || /^-[A-Za-z]*f/.test(w));
  return stash || pkill ? verdict("ask", T.ASK_SHARED_TREE) : undefined;
};

const commandFindings = (
  argv: string[],
  rest: string[],
  dir: string | null,
  f: Facts,
  subagent: boolean,
  fed: { secret: boolean; subst: boolean; dynamic: boolean; opaque: boolean },
): Finding[] => {
  const targets = deleteTargets(rest);
  const kind = lossKind(rest);
  const piped =
    targets !== undefined && argv.some((w) => PIPED.has(baseName(w)));
  return [
    ...[
      systemFinding(argv, rest, f, dir ?? f.cwd),
      secretFinding(argv, rest, f, dir),
      fedFinding(argv, rest, f, dir ?? f.cwd, fed),
      gitFinding(argv, f, dir),
      subagent ? sharedFinding(argv, rest) : undefined,
      piped && targets.length === 0
        ? verdict("ask", T.ASK_DELETE_PIPED, JEV)
        : undefined,
      kind && LOSS[kind],
    ].filter((x) => x !== undefined),
    ...(targets ? deleteFindings(targets, dir, f) : []),
  ];
};

/**
 * The parse of `command`. The config of `git` is read only when a `git` verb is neither a common command nor an alias of the text,
 * and a config that cannot be read leaves that verb unknown.
 */
const parseWithGit = async (
  command: string,
  f: Facts,
): Promise<ReturnType<typeof parse>> => {
  const common = new Set(GIT_COMMON_COMMANDS);
  const first = parse(command, {
    aliases: new Map(),
    commands: common,
    builtins: common,
  });
  if (!first.unknownVerb) return first;
  const config = await f.gitConfig?.().catch(() => undefined);
  if (config === undefined) return first;
  return parse(command, {
    aliases: new Map(
      Object.entries(config.aliases).map(([k, v]) => [k.toLowerCase(), v]),
    ),
    commands: new Set([...common, ...config.commands]),
    builtins: common,
  });
};

const bashFindings = (
  command: string,
  f: Facts,
  subagent: boolean,
  parsed: ReturnType<typeof parse>,
): Finding[] => {
  if (parsed.truncated) return [verdict("ask", T.ASK_TRUNCATED)];
  const out: Finding[] = runsDownload(parsed.commands)
    ? [verdict("ask", T.ASK_DOWNLOAD)]
    : [];
  if (parsed.unknown) out.push(verdict("ask", T.ASK_UNKNOWN_PROGRAM));
  if (parsed.gitProgram) out.push(verdict("ask", T.ASK_GIT_PROGRAM));
  const text = command.replace(LITERAL_DOC, "");
  const fed = {
    secret: holdsSecret(command, parsed.commands, f),
    subst: /\$\(|`/.test(command),
    dynamic: /[$`]/.test(text),
  };
  if (readsUnnamed(text))
    out.push(fed.secret ? verdict("ask", T.ASK_SECRET_FED) : envAsk(f));
  let dir: string | null = f.cwd;
  for (const argv of parsed.commands) {
    const rest = stripWrappers(argv);
    const moved = nextDir(rest, dir, f);
    if (moved !== undefined) dir = moved;
    out.push(
      ...commandFindings(argv, rest, dir, f, subagent, {
        ...fed,
        opaque: parsed.opaque.has(argv),
      }),
    );
  }
  for (const { target } of parsed.redirects) {
    const found = systemWrite(pathOf(dir ?? f.cwd, target, f));
    if (found) out.push(found);
  }
  const inputs = command.matchAll(/<\s*(['"]?)([^\s;&|<>'"]+)\1/g);
  const secret = [
    ...[...inputs]
      .map((m) => m[2] as string)
      .filter((w) => [f.cwd, dir ?? f.cwd].some((d) => secretWord(d, w, f))),
    ...parsed.code.map(codeSecret).filter((w) => w !== undefined),
  ][0];
  return secret === undefined ? out : [...out, denySecret(secret)];
};

const fileFindings = (
  tool: string,
  input: Record<string, unknown>,
  f: Facts,
): Finding[] => {
  const text = (key: string) => textOf(input, key);
  const file = text("file_path") || text("notebook_path");
  if (tool === "Edit" || tool === "Write" || tool === "NotebookEdit")
    return [systemWrite(pathOf(f.cwd, file, f))].filter((x) => x !== undefined);
  const named = [file, text("path")].filter(
    (w) => w !== "" && secretWord(f.cwd, w, f),
  );
  const globs = [text(GLOB_FIELD[tool] ?? "pattern")].filter((w) =>
    globsSecret(f.cwd, w, f),
  );
  const word = [...named, ...globs][0];
  return word === undefined ? [] : [denySecret(word)];
};

/** True when a gate can match the call: its input has a command, a path, or a pattern. Each other call is allowed with no read of the session. */
export const gated = (input: unknown): boolean =>
  ["command", "file_path", "notebook_path", "path", "pattern", "glob"].some(
    (k) => typeof (input as Record<string, unknown> | null)?.[k] === "string",
  );

/**
 * The verdict of the gate for the call of `tool` with `input`.
 * The strictest finding wins, and each `git` check runs only when no finding denies.
 * An `ask` gives the reason of each finding that asks, and it has `jev` only when each of them has it.
 * A `deny` of a `Bash` command that reads no secret gives the exact `!` command for the user.
 * `agentId` is set only for a call of a subagent.
 */
export const gate = async (
  {
    tool,
    input,
    agentId,
  }: { tool: string; input: unknown; agentId?: string | undefined },
  f: Facts,
): Promise<Verdict> => {
  const fields = (input ?? {}) as Record<string, unknown>;
  const command = textOf(fields, "command");
  const findings =
    tool === "Bash" || tool === "Monitor"
      ? bashFindings(
          command,
          f,
          agentId !== undefined,
          await parseWithGit(command, f),
        )
      : fileFindings(tool, fields, f);
  const verdicts = findings.filter((x) => typeof x !== "function");
  const denied = verdicts.find((v) => v.decision === "deny");
  if (denied)
    return verdict(
      "deny",
      tool === "Bash" && !denied.secret
        ? `${denied.reason}\n${T.RUN_HINT({ command })}`
        : (denied.reason as string),
    );
  for (const check of findings.filter((x) => typeof x === "function")) {
    const found = await check();
    if (found) verdicts.push(found);
  }
  const asks = verdicts.filter((v) => v.decision === "ask");
  if (asks.length === 0) return { decision: "allow" };
  const reason = [...new Set(asks.map((v) => v.reason))].join("\n");
  return verdict("ask", reason, asks.every((v) => v.jev) ? JEV : {});
};
