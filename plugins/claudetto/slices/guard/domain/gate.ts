// The permission gate (spec `permission-gate`, D4 of change `0-3-0`).
// It allows each call that no rule matches, and it stops only a call that loses bytes for good, tampers with the system, or reads a secret.
// A loss that a person can still approve gets `ask`, and a disk wipe, system tampering, and a secret read get `deny`.
// The function is pure except for `Facts.git`, which the adapter runs, and which a test stubs.

import { parse } from "../../../kernel/shell.ts";
import { readsScript, scriptOf } from "../../../kernel/shellkinds.ts";
import { baseName, stripWrappers } from "../../../kernel/wrappers.ts";
import * as T from "../prompts.ts";
import { erasesDisk } from "./disk.ts";
import { type GitScope, gitCall, localLoss, remoteRewrite } from "./git.ts";
import {
  codeNamesSecret,
  globsSecret,
  inBuild,
  inTmp,
  isSystem,
  namesSecret,
  type Places,
  pathOf,
  under,
} from "./paths.ts";

/** The folders of the session, and `git`, which gives `"clean"` when the files of `paths` in `scope` have a commit and no change. */
export type Facts = Places & {
  git: (
    scope: GitScope,
    dir: string,
    paths: string[],
  ) => Promise<"clean" | "dirty">;
};

/** A verdict. An `ask` with `jev` comes only from the delete and local `git` gates, so Jev can decide it before a person (D4). */
export type Verdict = {
  decision: "allow" | "ask" | "deny";
  reason?: string;
  jev?: true;
};

/** A verdict of a rule, which is `secret` when it stops a secret read, so the reason gives no `!` command. */
type Rule = Verdict & { secret?: true };

/** One finding of a rule: a verdict, or a `git` check whose dirty answer gives `ask` with `reason`. */
type Finding =
  | Rule
  | {
      scope: GitScope;
      dir: string;
      paths: string[];
      reason: string;
      jev?: true;
    };

const ask = (reason: string): Verdict => ({ decision: "ask", reason });
const askJev = (reason: string): Verdict => ({ ...ask(reason), jev: true });
const deny = (reason: string): Verdict => ({ decision: "deny", reason });
const denySecret = (word: string): Rule => ({
  ...deny(T.DENY_SECRET({ word })),
  secret: true,
});

const DELETES = new Set(["rm", "shred", "srm", "unlink"]);
const FIND_RUNS = new Set(["-exec", "-execdir", "-ok", "-okdir"]);
const PIPED = new Set(["xargs", "parallel"]);
/** The commands that take a secret path as a name only, and show no byte of the file. */
const NO_READ = new Set(
  "echo printf ls test [ touch stat cp mv rm unlink chmod chown ln".split(" "),
);
/** The commands that write to each operand, and the commands that write to the last one. */
const WRITES_ALL = new Set([
  "tee",
  "touch",
  "mkdir",
  "rmdir",
  "chmod",
  "chown",
  "chgrp",
  "truncate",
  ...DELETES,
]);
const WRITES_LAST = new Set(["cp", "mv", "install", "rsync", "ditto", "ln"]);
const ROOT_USERS = new Set(["sudo", "doas", "su"]);

const operands = (args: string[]): string[] => {
  const at = args.indexOf("--");
  const before = at < 0 ? args : args.slice(0, at);
  const after = at < 0 ? [] : args.slice(at + 1);
  return [...before.filter((a) => !a.startsWith("-")), ...after];
};

/** The paths that the delete command `rest` removes, or `null` when it is not a delete. */
const deleteTargets = (rest: string[]): string[] | null => {
  const name = baseName(rest[0] ?? "");
  if (DELETES.has(name)) return operands(rest.slice(1));
  if (name !== "find") return null;
  const runsDelete = rest.some(
    (w, i) =>
      w === "-delete" ||
      (FIND_RUNS.has(w) && DELETES.has(baseName(rest[i + 1] ?? ""))),
  );
  if (!runsDelete) return null;
  const end = rest.findIndex((w, i) => i > 0 && /^[-(!]/.test(w));
  const roots = rest.slice(1, end < 0 ? undefined : end);
  return roots.length ? roots : ["."];
};

const deleteFindings = (
  targets: string[],
  dir: string | null,
  f: Facts,
): Finding[] => {
  const tracked: string[] = [];
  const out: Finding[] = [];
  for (const target of targets) {
    const path = dir === null ? null : pathOf(dir, target, f);
    if (path === null) out.push(askJev(T.ASK_DELETE_UNREAD({ target })));
    else if (path === "/" || path === f.home)
      out.push(deny(T.DENY_ROOT({ target })));
    else if (inBuild(path, f)) continue;
    // A project in the temp folder keeps the `git` check of the project.
    else if (under(path, f.cwd)) tracked.push(path);
    else if (!inTmp(path, f))
      out.push(askJev(T.ASK_DELETE_OUTSIDE({ target })));
  }
  if (tracked.length)
    out.push({
      scope: "delete",
      dir: f.cwd,
      paths: tracked,
      reason: T.ASK_DELETE({ target: targets.join(" ") }),
      jev: true,
    });
  return out;
};

const writeTargets = (rest: string[]): string[] => {
  const name = baseName(rest[0] ?? "");
  const words = operands(rest.slice(1));
  if (WRITES_ALL.has(name)) return words;
  return WRITES_LAST.has(name) ? words.slice(-1) : [];
};

const rootModeFinding = (
  rest: string[],
  f: Facts,
  dir: string,
): Verdict | null => {
  const recursive = rest.some(
    (w) => w === "--recursive" || /^-[A-Za-z]*R/.test(w),
  );
  if (!recursive || !/^ch(?:mod|own|grp)$/.test(baseName(rest[0] ?? "")))
    return null;
  for (const target of operands(rest.slice(1))) {
    const path = pathOf(dir, target, f);
    if (path === "/" || path === f.home)
      return deny(T.DENY_ROOT_MODE({ target }));
  }
  return null;
};

const systemFinding = (
  argv: string[],
  rest: string[],
  f: Facts,
  dir: string,
): Verdict | null => {
  const prefix = argv.slice(0, argv.length - rest.length);
  if (
    prefix.some((w) => ROOT_USERS.has(baseName(w))) ||
    ROOT_USERS.has(baseName(rest[0] ?? ""))
  )
    return deny(T.DENY_ROOT_USER);
  if (erasesDisk(baseName(rest[0] ?? ""), rest)) return deny(T.DENY_DISK);
  const root = rootModeFinding(rest, f, dir);
  if (root) return root;
  for (const target of writeTargets(rest)) {
    const path = pathOf(dir, target, f);
    if (path !== null && isSystem(path))
      return deny(T.DENY_SYSTEM_WRITE({ path }));
  }
  return null;
};

const scriptFile = (rest: string[]): string | undefined => {
  const name = baseName(rest[0] ?? "");
  if (name === "source" || name === ".") return rest[1];
  if (/\.(?:sh|bash|zsh)$/.test(name)) return rest[0];
  return readsScript(rest) ? operands(rest.slice(1))[0] : undefined;
};

/** The finding of a command whose effect the gate cannot read: `eval`, a shell that reads its input, or a script that `git` has no commit of. */
const hiddenFinding = (
  argv: string[],
  rest: string[],
  f: Facts,
  dir: string | null,
): Finding | null => {
  const name = baseName(rest[0] ?? "");
  const script = scriptOf(argv);
  if (
    name === "eval" ||
    name.startsWith("$") ||
    rest[0] === "" ||
    script === "" ||
    /^\$\{?\w+\}?$/.test(script ?? "")
  )
    return ask(T.ASK_HIDDEN);
  const file = scriptFile(rest);
  if (file === undefined) return readsScript(rest) ? ask(T.ASK_HIDDEN) : null;
  const path = dir === null ? null : pathOf(dir, file, f);
  if (path !== null && under(path, f.cwd))
    return {
      scope: "delete",
      dir: f.cwd,
      paths: [path],
      reason: T.ASK_SCRIPT({ path: file }),
    };
  return path === null || inTmp(path, f)
    ? ask(T.ASK_SCRIPT({ path: file }))
    : null;
};

/** The finding of a `git` call: a push that rewrites the remote, or a local command that can lose work. */
const gitFinding = (
  argv: string[],
  f: Facts,
  dir: string | null,
): Finding | null => {
  const call = gitCall(argv);
  if (call === null) return null;
  if (remoteRewrite(call)) return ask(T.ASK_PUSH);
  const loss = localLoss(call);
  if (loss === null) return null;
  const reason = T.ASK_GIT_LOSS({ verb: call.verb });
  const at = dir === null ? null : pathOf(dir, call.dir ?? ".", f);
  if (loss === "always" || at === null) return askJev(reason);
  return { ...loss, dir: at, reason, jev: true };
};

const secretFinding = (
  rest: string[],
  f: Facts,
  dir: string | null,
): Rule | null => {
  if (NO_READ.has(baseName(rest[0] ?? ""))) return null;
  const word = rest.find((w) => namesSecret(dir ?? f.cwd, w, f));
  return word === undefined ? null : denySecret(word);
};

/** The new folder of a `cd` or `pushd` command `rest`, `undefined` for another command, and `null` when the gate cannot read it. */
const nextDir = (
  rest: string[],
  dir: string | null,
  f: Facts,
): string | null | undefined => {
  const name = baseName(rest[0] ?? "");
  if (name !== "cd" && name !== "pushd") return undefined;
  const target = operands(rest.slice(1))[0];
  if (target === undefined) return f.home;
  return dir === null || target === "-" ? null : pathOf(dir, target, f);
};

const commandFindings = (
  argv: string[],
  rest: string[],
  dir: string | null,
  f: Facts,
): Finding[] => {
  const targets = deleteTargets(rest);
  const piped = targets !== null && argv.some((w) => PIPED.has(baseName(w)));
  return [
    ...[
      systemFinding(argv, rest, f, dir ?? f.cwd),
      secretFinding(rest, f, dir),
      hiddenFinding(argv, rest, f, dir),
      gitFinding(argv, f, dir),
      piped && targets.length === 0 ? askJev(T.ASK_DELETE_PIPED) : null,
    ].filter((x) => x !== null),
    ...(targets ? deleteFindings(targets, dir, f) : []),
  ];
};

/** The finding of a secret that a `<` redirection or the code of the command reads. */
const inputFindings = (
  command: string,
  code: string[],
  f: Facts,
): Finding[] => {
  const inputs = command.matchAll(/<\s*(['"]?)([^\s;&|<>'"]+)\1/g);
  const words = [...inputs].map((m) => m[2] as string);
  const secret = [
    ...words.filter((w) => namesSecret(f.cwd, w, f)),
    ...code.filter(codeNamesSecret),
  ][0];
  return secret === undefined ? [] : [denySecret(secret)];
};

const bashFindings = (command: string, f: Facts): Finding[] => {
  const parsed = parse(command);
  if (parsed.truncated) return [ask(T.ASK_TRUNCATED)];
  const out: Finding[] = [];
  let dir: string | null = f.cwd;
  for (const argv of parsed.commands) {
    const rest = stripWrappers(argv);
    const moved = nextDir(rest, dir, f);
    if (moved !== undefined) dir = moved;
    out.push(...commandFindings(argv, rest, dir, f));
  }
  for (const { target } of parsed.redirects) {
    const path = pathOf(dir ?? f.cwd, target, f);
    if (path !== null && isSystem(path))
      out.push(deny(T.DENY_SYSTEM_WRITE({ path })));
  }
  out.push(...inputFindings(command, parsed.code, f));
  return out;
};

const fileFindings = (
  tool: string,
  input: Record<string, unknown>,
  f: Facts,
): Finding[] => {
  const text = (key: string) =>
    typeof input[key] === "string" ? (input[key] as string) : "";
  const file = text("file_path");
  if (tool === "Edit" || tool === "Write") {
    const path = pathOf(f.cwd, file, f);
    return path !== null && isSystem(path)
      ? [deny(T.DENY_SYSTEM_WRITE({ path }))]
      : [];
  }
  const words = [file, text("path")].filter(
    (w) => w !== "" && namesSecret(f.cwd, w, f),
  );
  const globs = [text(tool === "Grep" ? "glob" : "pattern")].filter(
    globsSecret,
  );
  const word = [...words, ...globs][0];
  return word === undefined ? [] : [denySecret(word)];
};

const dirtyVerdicts = async (
  findings: Finding[],
  f: Facts,
): Promise<Rule[]> => {
  const out: Rule[] = [];
  for (const x of findings) {
    if ("decision" in x) continue;
    if ((await f.git(x.scope, x.dir, x.paths)) === "dirty")
      out.push(x.jev ? askJev(x.reason) : ask(x.reason));
  }
  return out;
};

/**
 * The verdict of the gate for the call of `tool` with `input`.
 * The strictest finding wins, and each `git` check runs only when no finding denies.
 * An `ask` gives the reason of each finding that asks, and it has `jev` only when each of them has it.
 * A `deny` of a `Bash` command that reads no secret gives the exact `!` command for the user.
 */
export const gate = async (
  { tool, input }: { tool: string; input: unknown },
  f: Facts,
): Promise<Verdict> => {
  const fields = (input ?? {}) as Record<string, unknown>;
  const command =
    typeof fields["command"] === "string" ? (fields["command"] as string) : "";
  const findings =
    tool === "Bash" ? bashFindings(command, f) : fileFindings(tool, fields, f);
  const verdicts = findings.filter((x): x is Rule => "decision" in x);
  const denied = verdicts.find((v) => v.decision === "deny");
  if (denied)
    return deny(
      tool === "Bash" && !denied.secret
        ? `${denied.reason}\n${T.RUN_HINT({ command })}`
        : (denied.reason as string),
    );
  verdicts.push(...(await dirtyVerdicts(findings, f)));
  const asks = verdicts.filter((v) => v.decision === "ask");
  if (asks.length === 0) return { decision: "allow" };
  const reason = [...new Set(asks.map((v) => v.reason))].join("\n");
  return asks.every((v) => v.jev) ? askJev(reason) : ask(reason);
};
