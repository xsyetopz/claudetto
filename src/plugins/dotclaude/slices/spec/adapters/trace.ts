// `dotclaude-spec trace [<id>] [--in <dir>] [--package <p>] [--json]`: finds each orphan ID and each uncited line in the diff of a change.
// The diff is `git diff <base>..HEAD`, read in `<dir>` (default: the root). `<dir>` must be a worktree of this repository.
// With `--package <p>`, the trace reports only the findings in files that `owns` of the package covers. The base is the `sha` of the first `doing` event of the change, which `implement` records.
// An event with no `sha` gives the parent of the first commit after the time of the event.
// A change with no base is an error, and not a clean trace: the trace refuses, and so does `accept`.
// The trace reads only source files, and skips each file that `.gitattributes` marks `linguist-generated`.

import path from "node:path";
import type { StateEvent } from "../../../../../kernel/spec-store.ts";
import {
  addedLines,
  type Finding,
  isSourcePath,
  traceLines,
} from "../domain/trace.ts";
import { parseArgs } from "./args.ts";
import { readPackages, usedRequirementNumbers } from "./files.ts";
import { exec, isWorktreeOf } from "./git.ts";
import { type Run, resolveId } from "./run.ts";
import { stop, usage } from "./transition.ts";

const USAGE =
  "Usage: dotclaude-spec trace [<id>] [--in <dir>] [--package <p>] [--json]";

/** The files that `git check-attr` gets in one call. */
const CHECK_CHUNK = 100;

/** The result of one trace: the base and the findings, or the reason that the trace has no base. */
export type TraceResult =
  | { readonly ok: true; readonly base: string; readonly findings: Finding[] }
  | { readonly ok: false; readonly reason: string };

/** The first `doing` event of the change: the move of the first package from `planned`, where `implement` records the `sha`. */
const firstImplement = (
  events: readonly StateEvent[],
): StateEvent | undefined => events.find((e) => e.state === "doing");

/** The tree that has no file, for a diff from a root commit. */
const emptyTree = (cwd: string): string =>
  exec(cwd, "git", ["hash-object", "-t", "tree", "/dev/null"]).out;

/** True when `sha` names a commit in the repository. */
const isCommit = (cwd: string, sha: string): boolean =>
  exec(cwd, "git", ["rev-parse", "--verify", "--quiet", `${sha}^{commit}`])
    .code === 0;

/** The parent of the first commit after `at` (the empty tree for a root commit), or null when no commit came after it. */
const baseByTime = (cwd: string, at: string): string | null => {
  const seconds = Math.floor(Date.parse(at) / 1000);
  if (Number.isNaN(seconds)) return null;
  const log = exec(cwd, "git", [
    "rev-list",
    "--reverse",
    `--since=${seconds}`,
    "HEAD",
  ]);
  const commit = log.stdout.split("\n")[0]?.trim() ?? "";
  if (log.code !== 0 || commit === "") return null;
  const parent = exec(cwd, "git", [
    "rev-parse",
    "--verify",
    "--quiet",
    `${commit}^`,
  ]);
  return parent.code === 0 ? parent.stdout.trim() : emptyTree(cwd);
};

/**
 * The base of the diff of a change, or the reason that it has none.
 * The base is the `sha` of the first `doing` event.
 * Only an event with no `sha` gives the parent of the first commit after its time.
 * No `doing` event, a `sha` that is no commit, and no commit after the time each give a reason.
 */
export const baseOf = (
  cwd: string,
  events: readonly StateEvent[],
): { base: string } | { reason: string } => {
  const first = firstImplement(events);
  if (first === undefined)
    return {
      reason: "The change has no `implement` event, so it has no base.",
    };
  if (first.sha !== undefined)
    return isCommit(cwd, first.sha)
      ? { base: first.sha }
      : {
          reason: `The \`sha\` \`${first.sha}\` of the \`implement\` event is no commit.`,
        };
  const base = baseByTime(cwd, first.at);
  return base === null
    ? {
        reason:
          "The first `implement` event has no `sha`, and no commit came after its time, so the change has no base.",
      }
    : { base };
};

/** The files of `files` that `.gitattributes` marks `linguist-generated`. */
const generatedFiles = (cwd: string, files: readonly string[]): Set<string> => {
  const generated = new Set<string>();
  for (let i = 0; i < files.length; i += CHECK_CHUNK) {
    const r = exec(cwd, "git", [
      "check-attr",
      "-z",
      "linguist-generated",
      "--",
      ...files.slice(i, i + CHECK_CHUNK),
    ]);
    const parts = r.stdout.split("\0");
    for (let j = 0; j + 2 < parts.length; j += 3)
      if (parts[j + 2] === "set" || parts[j + 2] === "true")
        generated.add(parts[j] ?? "");
  }
  return generated;
};

/** Where and what to trace: the folder whose diff is read, and the `owns` that limit the findings. */
export interface TraceScope {
  readonly dir?: string;
  readonly owns?: readonly string[];
}

/** True when `file` is in one of the `owns` entries, each a file or a folder prefix. */
const isOwned = (file: string, owns: readonly string[]): boolean =>
  owns.some((o) => file.startsWith(o));

/**
 * The trace of the change `id`. The events are the events of the change.
 * The diff is read in `scope.dir` (default: the root). The base comes from the events.
 */
export const traceChange = async (
  run: Run,
  events: readonly StateEvent[],
  scope: TraceScope = {},
): Promise<TraceResult> => {
  const cwd = scope.dir ?? run.store.root;
  const found = baseOf(cwd, events);
  if ("reason" in found) return { ok: false, reason: found.reason };
  const { base } = found;
  const diff = exec(cwd, "git", [
    "-c",
    "core.quotePath=false",
    "diff",
    "--no-color",
    "--no-ext-diff",
    "--no-renames",
    "--unified=0",
    `${base}..HEAD`,
  ]);
  if (diff.code !== 0) throw new Error(`git diff failed: ${diff.out}`);
  const read = addedLines(diff.stdout).filter((l) => isSourcePath(l.file));
  const generated = generatedFiles(cwd, [...new Set(read.map((l) => l.file))]);
  const known = new Set(await usedRequirementNumbers(run.store));
  return {
    ok: true,
    base,
    findings: traceLines(
      read.filter(
        (l) =>
          !generated.has(l.file) &&
          (scope.owns === undefined || isOwned(l.file, scope.owns)),
      ),
      known,
    ),
  };
};

/** One finding as one line: `file:line: orphan REQ-<n>` or `file:line: uncited: <text>`. */
const findingText = (f: Finding): string =>
  f.kind === "orphan"
    ? `${f.file}:${f.line}: orphan \`REQ-${f.id}\` is in no requirement`
    : `${f.file}:${f.line}: uncited line \`${f.text}\``;

export const traceCommand = async (
  run: Run,
  args: string[],
): Promise<number> => {
  const parsed = parseArgs(args, { values: ["in", "package"] });
  if (typeof parsed === "string") return usage(run, parsed);
  const [given, extra] = parsed.words;
  if (extra !== undefined) return usage(run, USAGE);
  const id = await resolveId(run, given);
  if (id === null) return 1;
  const events = await run.store.events(id);
  if (events === null) return stop(run, `The change \`${id}\` does not exist.`);
  const dir = path.resolve(run.store.root, parsed.values["in"] ?? ".");
  if (!isWorktreeOf(dir, run.store.root))
    return stop(
      run,
      `The folder \`${dir}\` is not a worktree of this repository.`,
    );
  const pkg = parsed.values["package"];
  const owns =
    pkg === undefined
      ? undefined
      : (await readPackages(run.store, id)).find((p) => p.id === pkg)?.owns;
  if (pkg !== undefined && owns === undefined)
    return stop(run, `The change \`${id}\` has no package \`${pkg}\`.`);
  const traced = await traceChange(
    run,
    events,
    owns === undefined ? { dir } : { dir, owns },
  );
  if (!traced.ok) return stop(run, traced.reason);
  const { base, findings } = traced;
  if (parsed.json)
    run.io.log(
      JSON.stringify({ command: "trace", change: id, base, findings }),
    );
  else if (findings.length === 0)
    run.io.log(`${id}: no orphan and no uncited line.`);
  else for (const f of findings) run.io.log(findingText(f));
  return findings.length === 0 ? 0 : 1;
};
