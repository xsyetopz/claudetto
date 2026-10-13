// Helpers of the phase command tests: a git repository with a store, and a run of one phase command.
// The commands run directly, so a test does not depend on the commands that `cli.ts` also registers.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { acceptCommand } from "../../../../src/plugins/dotclaude/slices/spec/adapters/accept.ts";
import { archiveCommand } from "../../../../src/plugins/dotclaude/slices/spec/adapters/archive.ts";
import { blockCommand } from "../../../../src/plugins/dotclaude/slices/spec/adapters/block.ts";
import { dropCommand } from "../../../../src/plugins/dotclaude/slices/spec/adapters/drop.ts";
import { implementCommand } from "../../../../src/plugins/dotclaude/slices/spec/adapters/implement.ts";
import { mergeCommand } from "../../../../src/plugins/dotclaude/slices/spec/adapters/merge.ts";
import { planCommand } from "../../../../src/plugins/dotclaude/slices/spec/adapters/plan.ts";
import { reviewCommand } from "../../../../src/plugins/dotclaude/slices/spec/adapters/review.ts";
import type { Run } from "../../../../src/plugins/dotclaude/slices/spec/adapters/run.ts";
import { specifyCommand } from "../../../../src/plugins/dotclaude/slices/spec/adapters/specify.ts";
import { SpecStore } from "../../../../src/plugins/dotclaude/slices/spec/adapters/store.ts";
import { traceCommand } from "../../../../src/plugins/dotclaude/slices/spec/adapters/trace.ts";
import { verifyCommand } from "../../../../src/plugins/dotclaude/slices/spec/adapters/verify.ts";

const COMMANDS: Readonly<
  Record<string, (run: Run, args: string[]) => Promise<number>>
> = {
  specify: specifyCommand,
  plan: planCommand,
  implement: implementCommand,
  verify: verifyCommand,
  review: reviewCommand,
  merge: mergeCommand,
  accept: acceptCommand,
  trace: traceCommand,
  archive: archiveCommand,
  block: blockCommand,
  drop: dropCommand,
};

export const CHANGES = ".dotclaude/spec/changes";

/** The result of one command: the exit status, and the lines of both streams. */
export interface Result {
  code: number;
  out: string[];
  err: string[];
  /** The `--json` line of the command, parsed. It is undefined when the command printed no line. */
  json: Record<string, unknown>;
}

/** Runs `git` in `cwd` and gives the trimmed output. */
export const git = (cwd: string, ...args: string[]): string => {
  const r = Bun.spawnSync(
    ["git", "-c", "user.name=t", "-c", "user.email=t@t", ...args],
    { cwd },
  );
  if (r.exitCode !== 0)
    throw new Error(`git ${args.join(" ")}: ${r.stderr.toString()}`);
  return r.stdout.toString().trim();
};

/** A new git repository in a temporary folder, with one commit unless `commit` is false. */
export const makeRepo = (commit = true): string => {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "phase-")),
  );
  git(root, "init", "-q", "-b", "main");
  if (commit) git(root, "commit", "-q", "--allow-empty", "-m", "init");
  return root;
};

/** A linked worktree of `root` on the new branch `branch`, in a new temporary folder. It gives the folder. */
export const linkedWorktree = (root: string, branch: string): string => {
  const dir = path.join(
    fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "phase-wt-"))),
    "wt",
  );
  git(root, "worktree", "add", "-q", "-b", branch, dir);
  return dir;
};

/** Adds a commit with the file `rel` to the repository `cwd`. It gives the new SHA. */
export const commitFile = (cwd: string, rel: string, text = "x\n"): string => {
  write(cwd, rel, text);
  git(cwd, "add", "--", rel);
  git(cwd, "commit", "-q", "-m", `add ${rel}`);
  return git(cwd, "rev-parse", "HEAD");
};

/** Runs the phase command `name` with `args` in `root`, at a fixed time. */
export const phase = async (
  root: string,
  name: string,
  ...args: string[]
): Promise<Result> => {
  const out: string[] = [];
  const err: string[] = [];
  const command = COMMANDS[name];
  if (!command) throw new Error(`No phase command \`${name}\`.`);
  const code = await command(
    {
      store: new SpecStore(root),
      io: { log: (l) => out.push(l), error: (l) => err.push(l) },
      clock: { now: () => new Date("2026-10-13T10:00:00.000Z") },
    },
    args,
  );
  const last = out.at(-1);
  const json =
    args.includes("--json") && last !== undefined ? JSON.parse(last) : {};
  return { code, out, err, json };
};

export const file = (root: string, rel: string): Promise<string> =>
  Bun.file(path.join(root, rel)).text();

export const exists = (root: string, rel: string): boolean =>
  fs.existsSync(path.join(root, rel));

export const write = async (
  root: string,
  rel: string,
  text: string,
): Promise<void> => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  await Bun.write(path.join(root, rel), text);
};

/** The events of the change `id`, without the header line. */
export const eventsOf = async (
  root: string,
  id: string,
): Promise<Record<string, unknown>[]> =>
  (await file(root, `${CHANGES}/${id}/events.jsonl`))
    .split("\n")
    .filter((l) => l !== "")
    .slice(1)
    .map((l) => JSON.parse(l));

/** The value of the front matter key `key` in the file `rel`. */
export const frontKey = async (
  root: string,
  rel: string,
  key: string,
): Promise<string> =>
  new RegExp(`^${key}: (.*)$`, "m").exec(await file(root, rel))?.[1] ?? "";

export const pkgFile = (id: string, pkg = "P1"): string =>
  `${CHANGES}/${id}/packages/${pkg}.md`;

export const changeFile = (id: string): string => `${CHANGES}/${id}/change.md`;

/** Sets the `verify` key of the package file to `command`. */
export const setVerify = async (
  root: string,
  id: string,
  command: string,
  pkg = "P1",
): Promise<void> =>
  write(
    root,
    pkgFile(id, pkg),
    (await file(root, pkgFile(id, pkg))).replace(
      /^verify: .*$/m,
      `verify: ${JSON.stringify(command)}`,
    ),
  );

/** A repository with the trivial change `id` in `planned` after two `specify` calls, and the verify command of `P1` set to `command`. */
export const plannedChange = async (
  id = "c1",
  command = "true",
): Promise<string> => {
  const root = makeRepo();
  await phase(root, "specify", id, "--size", "trivial");
  await phase(root, "specify", id);
  await setVerify(root, id, command);
  return root;
};

/** The same repository with `P1` in `state`, reached with the commands. */
export const packageIn = async (
  state: "doing" | "verified" | "approved" | "done",
  id = "c1",
  command = "true",
): Promise<string> => {
  const root = await plannedChange(id, command);
  await phase(root, "implement", "P1");
  if (state === "doing") return root;
  await phase(root, "verify", "P1");
  if (state === "verified") return root;
  await phase(root, "review", "P1", "approve");
  if (state === "approved") return root;
  await phase(root, "merge", "P1");
  return root;
};
