// The permission gate (spec `permission-gate`, D4): it stops only a call that loses bytes for good, tampers with the system, or reads a secret.
// The function is pure except for `Facts.git` and `Facts.userEdits`, which the adapter runs and a test stubs.

import { parse } from "../../../kernel/shell.ts";
import { readsScript, scriptOf } from "../../../kernel/shellkinds.ts";
import { baseName, stripWrappers } from "../../../kernel/wrappers.ts";
import * as T from "../prompts.ts";
import { DELETES, deleteTargets, erasesDisk, operands } from "./delete.ts";
import {
  bulkStage,
  type GitScope,
  gitCall,
  localLoss,
  remoteRewrite,
} from "./git.ts";
import { isDbFile, lossKind } from "./loss.ts";
import {
  codeSecret,
  globsSecret,
  inTmp,
  isSystem,
  namesSecret,
  type Places,
  pathOf,
} from "./paths.ts";

/** The folders of the session, `git` (`"clean"` when the files of `paths` in `scope` have a commit and no change), and `userEdits` (the changed files of `dir` that the edit ledger does not know). */
export type Facts = Places & {
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

/** A verdict, or a check that runs `git` or reads the ledger, and gives an `ask` or `null`. */
type Finding = Verdict | (() => Promise<Verdict | null>);

const ask = (reason: string): Verdict => ({ decision: "ask", reason });
const askJev = (reason: string): Verdict => ({ ...ask(reason), jev: true });
const deny = (reason: string): Verdict => ({ decision: "deny", reason });
const denySecret = (word: string): Verdict => ({
  ...deny(T.DENY_SECRET({ word })),
  secret: true,
});
const words = (s: string) => new Set(s.split(" "));
const LOSS = {
  db: askJev(T.ASK_DB_LOSS),
  infra: ask(T.ASK_INFRA_LOSS),
  none: null,
};
const PIPED = words("xargs parallel");
const ROOT_USERS = words("sudo doas su");
const DOWNLOADS = words("curl wget");
/** The commands that take a secret path as a name only. */
const NO_READ = words(
  "echo printf ls test [ touch stat cp mv rm unlink chmod chown ln",
);
const WRITES_ALL = new Set([
  ...words("tee touch mkdir rmdir chmod chown chgrp truncate"),
  ...DELETES,
]);
const WRITES_LAST = words("cp mv install rsync ditto ln");
/** The file of an upload word: `@f` of `curl -d @f`, `-d@f`, and `name=@f` or `name=<f` of `curl -F`. */
const UPLOAD = /^(?:-[A-Za-z]|[^=@<]*=)?[@<](.+)$/;

const systemWrite = (path: string | null): Verdict | null =>
  path !== null && isSystem(path) ? deny(T.DENY_SYSTEM_WRITE({ path })) : null;

/** A delete asks when the gate cannot read its target or removes a database file outside the temp folder, and it is denied for the root or the home folder (D1). */
const deleteFindings = (
  targets: string[],
  dir: string | null,
  f: Facts,
): Verdict[] =>
  targets.flatMap((target) => {
    const path = dir === null ? null : pathOf(dir, target, f);
    if (path === null) return [askJev(T.ASK_DELETE_UNREAD({ target }))];
    if (path === "/" || path === f.home) return [deny(T.DENY_ROOT({ target }))];
    return isDbFile(path) && !inTmp(path, f) ? [askJev(T.ASK_DB_LOSS)] : [];
  });

const systemFinding = (
  argv: string[],
  rest: string[],
  f: Facts,
  dir: string,
): Verdict | null => {
  const name = baseName(rest[0] ?? "");
  const prefix = argv.slice(0, argv.length - rest.length);
  if (prefix.some((w) => ROOT_USERS.has(baseName(w))) || ROOT_USERS.has(name))
    return deny(T.DENY_ROOT_USER);
  if (erasesDisk(name, rest)) return deny(T.DENY_DISK);
  const all = WRITES_ALL.has(name);
  if (!all && !WRITES_LAST.has(name)) return null;
  const args = operands(rest.slice(1));
  const recursive = rest.some(
    (w) => w === "--recursive" || /^-[A-Za-z]*R/.test(w),
  );
  for (const target of recursive && /^ch(?:mod|own|grp)$/.test(name)
    ? args
    : []) {
    const path = pathOf(dir, target, f);
    if (path === "/" || path === f.home)
      return deny(T.DENY_ROOT_MODE({ target }));
  }
  const written = all ? args : args.slice(-1);
  return (
    written.map((w) => systemWrite(pathOf(dir, w, f))).find(Boolean) ?? null
  );
};

/** A shell that runs a download from the network: `curl ... | sh`. */
const runsDownload = (commands: string[][]): boolean =>
  commands.some((argv) =>
    DOWNLOADS.has(baseName(stripWrappers(argv)[0] ?? "")),
  ) && commands.some((argv) => readsScript(argv) || scriptOf(argv) === "");

/** The finding of a `git` call: a push that rewrites the remote, or a local command that can lose work. */
const gitFinding = (
  argv: string[],
  f: Facts,
  dir: string | null,
): Finding | null => {
  const call = gitCall(argv);
  if (call === null) return null;
  if (remoteRewrite(call)) return ask(T.ASK_PUSH);
  const at = dir === null ? null : pathOf(dir, call.dir ?? ".", f);
  if (bulkStage(call))
    return async () => {
      const files = await f.userEdits(at ?? f.cwd);
      const list = files.map((p) => `\`${p}\``).join(", ");
      return files.length > 0 ? ask(T.ASK_BULK_STAGE({ files: list })) : null;
    };
  const loss = localLoss(call);
  if (loss === null) return null;
  const reason = T.ASK_GIT_LOSS({ verb: call.verb });
  if (loss === "always" || at === null) return askJev(reason);
  return async () =>
    (await f.git(loss.scope, at, loss.paths)) === "dirty"
      ? askJev(reason)
      : null;
};

/** A read of a secret file by name or by an upload word, or a print of each environment variable with a bare `env` or `printenv`. */
const secretFinding = (
  argv: string[],
  rest: string[],
  f: Facts,
  dir: string | null,
): Verdict | null => {
  const name = baseName(rest[0] ?? "");
  const bareEnv = rest.length === 0 && argv.some((w) => baseName(w) === "env");
  if (bareEnv || (name === "printenv" && operands(rest.slice(1)).length === 0))
    return { ...deny(T.DENY_ENV_DUMP), secret: true };
  if (NO_READ.has(name)) return null;
  const word = rest
    .flatMap((w) => [w, UPLOAD.exec(w)?.[1] ?? ""])
    .find((w) => w !== "" && namesSecret(dir ?? f.cwd, w, f));
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

/** A `git stash` (except `list` and `show`) or a `pkill -f` from a subagent, which changes the state of the main agent (X4). */
const sharedFinding = (argv: string[], rest: string[]): Verdict | null => {
  const call = gitCall(argv);
  const stash =
    call?.verb === "stash" && !["list", "show"].includes(call.args[0] ?? "");
  const pkill =
    baseName(rest[0] ?? "") === "pkill" &&
    rest.some((w) => w === "--full" || /^-[A-Za-z]*f/.test(w));
  return stash || pkill ? ask(T.ASK_SHARED_TREE) : null;
};

const commandFindings = (
  argv: string[],
  rest: string[],
  dir: string | null,
  f: Facts,
  subagent: boolean,
): Finding[] => {
  const targets = deleteTargets(rest);
  const piped = targets !== null && argv.some((w) => PIPED.has(baseName(w)));
  return [
    ...[
      systemFinding(argv, rest, f, dir ?? f.cwd),
      secretFinding(argv, rest, f, dir),
      gitFinding(argv, f, dir),
      subagent ? sharedFinding(argv, rest) : null,
      piped && targets.length === 0 ? askJev(T.ASK_DELETE_PIPED) : null,
      LOSS[lossKind(rest) ?? "none"],
    ].filter((x) => x !== null),
    ...(targets ? deleteFindings(targets, dir, f) : []),
  ];
};

const bashFindings = (
  command: string,
  f: Facts,
  subagent: boolean,
): Finding[] => {
  const parsed = parse(command);
  if (parsed.truncated) return [ask(T.ASK_TRUNCATED)];
  const out: Finding[] = runsDownload(parsed.commands)
    ? [ask(T.ASK_DOWNLOAD)]
    : [];
  let dir: string | null = f.cwd;
  for (const argv of parsed.commands) {
    const rest = stripWrappers(argv);
    const moved = nextDir(rest, dir, f);
    if (moved !== undefined) dir = moved;
    out.push(...commandFindings(argv, rest, dir, f, subagent));
  }
  for (const { target } of parsed.redirects) {
    const found = systemWrite(pathOf(dir ?? f.cwd, target, f));
    if (found) out.push(found);
  }
  const inputs = command.matchAll(/<\s*(['"]?)([^\s;&|<>'"]+)\1/g);
  const secret = [
    ...[...inputs]
      .map((m) => m[2] as string)
      .filter((w) => namesSecret(f.cwd, w, f)),
    ...parsed.code.map(codeSecret).filter((w) => w !== undefined),
  ][0];
  return secret === undefined ? out : [...out, denySecret(secret)];
};

const fileFindings = (
  tool: string,
  input: Record<string, unknown>,
  f: Facts,
): Finding[] => {
  const text = (key: string) =>
    typeof input[key] === "string" ? (input[key] as string) : "";
  const file = text("file_path");
  if (tool === "Edit" || tool === "Write")
    return [systemWrite(pathOf(f.cwd, file, f))].filter((x) => x !== null);
  const named = [file, text("path")].filter(
    (w) => w !== "" && namesSecret(f.cwd, w, f),
  );
  const globs = [text(tool === "Grep" ? "glob" : "pattern")].filter(
    globsSecret,
  );
  const word = [...named, ...globs][0];
  return word === undefined ? [] : [denySecret(word)];
};

/** True when a gate can match the call: its input has a command, a path, or a pattern. Each other call is allowed with no read of the session. */
export const gated = (input: unknown): boolean =>
  ["command", "file_path", "path", "pattern", "glob"].some(
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
  const command =
    typeof fields["command"] === "string" ? (fields["command"] as string) : "";
  const findings =
    tool === "Bash" || tool === "Monitor"
      ? bashFindings(command, f, agentId !== undefined)
      : fileFindings(tool, fields, f);
  const verdicts = findings.filter((x) => typeof x !== "function");
  const denied = verdicts.find((v) => v.decision === "deny");
  if (denied)
    return deny(
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
  return asks.every((v) => v.jev) ? askJev(reason) : ask(reason);
};
