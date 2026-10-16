// The CLI `claudetto-gc` of the `gc` slice. The launcher `bin/claudetto-gc` calls `main`.
//
//   claudetto-gc [--dry-run] [--ending <session id>]
//
// It sweeps the recorded outputs of the sessions (design D6): the records are in `~/.claudetto/gc/`, one file for each session.
// An output goes only when it is in the record, strictly inside the temp folder or the worktree folder of its project, and no live session needs it.
// A symlink is never followed out of a root: a path that is a symlink, or that lies behind one, stays and is reported.
// A live session is a file in `sessions/` of the config folder whose process runs.
// `--ending` names the session that ends now, so its own outputs do not count as held.
// `--dry-run` lists each path with its size and removes nothing.
// Exit status: 0 on success, 1 when a path could not be removed, 2 for a usage error.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { writeAtomic } from "../../../../../kernel/node/fs.ts";
import type { Plan } from "../domain/plan.ts";
import { type Entry, isInside, planSweep, sizeText } from "../domain/plan.ts";
import {
  type GcRecord,
  gcDirOf,
  parseRecords,
  projectOfWorktree,
  serialize,
} from "../domain/record.ts";
import { AGE_MAX_MS, SIZE_MAX_BYTES } from "../limits.ts";

const USAGE = "Usage: claudetto-gc [--dry-run] [--ending <session id>]";

export interface SweepOptions {
  /** The folder of the record files. */
  readonly gcDir: string;
  /** The `sessions/` folder of the Claude Code config folder. */
  readonly sessionsDir: string;
  /** The temp folders that can hold an output. A folder that does not exist is left out. */
  readonly temps: readonly string[];
  readonly now: number;
  readonly ageMaxMs: number;
  readonly sizeMaxBytes: number;
  readonly dryRun: boolean;
  /** The session that ends now. */
  readonly ending?: string;
  /** True when the process `pid` runs. */
  readonly isAlive: (pid: number) => boolean;
}

export interface SweepResult {
  readonly plan: Plan;
  /** The paths that the sweep could not remove, with the error. */
  readonly failed: readonly string[];
  readonly text: string;
}

/** The real path of `p`, or null when nothing exists there. */
const realOrNull = async (p: string): Promise<string | null> => {
  try {
    return await fs.realpath(p);
  } catch (err) {
    if ((err as { code?: string }).code === "ENOENT") return null;
    throw err;
  }
};

/** The size in bytes of `p`, with each symlink counted as a link and never followed. */
const sizeOf = async (p: string): Promise<number> => {
  const st = await fs.lstat(p);
  if (!st.isDirectory()) return st.size;
  let sum = 0;
  for (const name of await fs.readdir(p))
    sum += await sizeOf(path.join(p, name));
  return sum;
};

/** The entries of the folder `dir` whose name ends in `.json`, or an empty list when the folder is missing. */
const jsonFiles = async (dir: string): Promise<string[]> => {
  try {
    return (await fs.readdir(dir))
      .filter((name) => name.endsWith(".json"))
      .map((name) => path.join(dir, name));
  } catch (err) {
    if ((err as { code?: string }).code === "ENOENT") return [];
    throw err;
  }
};

interface Live {
  readonly ids: Set<string>;
  /** The folders of the live sessions, as given and as real paths. */
  readonly cwds: string[];
}

/** The sessions that run: the files in `sessions/` whose process is alive, without the ending session. */
const liveSessions = async (opts: SweepOptions): Promise<Live> => {
  const live: Live = { ids: new Set(), cwds: [] };
  for (const file of await jsonFiles(opts.sessionsDir)) {
    let data: { pid?: unknown; sessionId?: unknown; cwd?: unknown };
    try {
      data = JSON.parse(await Bun.file(file).text());
    } catch {
      continue;
    }
    if (typeof data.pid !== "number" || !opts.isAlive(data.pid)) continue;
    if (typeof data.sessionId !== "string" || data.sessionId === opts.ending)
      continue;
    live.ids.add(data.sessionId);
    if (typeof data.cwd === "string") {
      live.cwds.push(data.cwd);
      const real = await realOrNull(data.cwd);
      if (real !== null) live.cwds.push(real);
    }
  }
  return live;
};

/** The allowed roots of a record, as real paths: the temp folders, and the worktree folder of its project. */
const rootsOf = async (
  record: GcRecord,
  temps: readonly string[],
): Promise<string[]> => {
  const roots = [...temps];
  const project = projectOfWorktree(record.path);
  if (project !== undefined && isInside(project, record.cwd))
    roots.push(`${project}/.claude/worktrees`);
  const real = await Promise.all(roots.map(realOrNull));
  return [...new Set(real.filter((r): r is string => r !== null))];
};

/** The entry of a record, with the facts from the disk. */
const entryOf = async (
  record: GcRecord,
  temps: readonly string[],
  live: Live,
): Promise<Entry> => {
  const roots = await rootsOf(record, temps);
  let isLink = false;
  try {
    isLink = (await fs.lstat(record.path)).isSymbolicLink();
  } catch (err) {
    if ((err as { code?: string }).code !== "ENOENT") throw err;
  }
  const real = await realOrNull(record.path);
  const held =
    live.ids.has(record.session) ||
    (real !== null && live.cwds.some((cwd) => isInside(real, cwd)));
  const size = real === null || isLink ? 0 : await sizeOf(real);
  return { record, real, isLink, size, roots, held };
};

const lineOf = (verb: string, size: number, record: GcRecord, why: string) =>
  `${verb} ${sizeText(size)} ${record.path} (${why})`;

/** The report of the sweep: one line for each path that is not gone, and the totals. */
const report = (plan: Plan, dryRun: boolean, failed: readonly string[]) => {
  const lines = plan.verdicts
    .filter((v) => v.action !== "gone")
    .map((v) => {
      const verb =
        v.action === "remove" ? (dryRun ? "would remove" : "remove") : v.action;
      return lineOf(verb, v.size, v.record, v.reason);
    });
  for (const f of failed) lines.push(`failed ${f}`);
  const noun = plan.removed === 1 ? "path" : "paths";
  lines.push(
    dryRun
      ? `Dry run: ${plan.removed} ${noun} would go, and ${sizeText(plan.freed)} would be freed.`
      : `Removed ${plan.removed} ${noun}, freed ${sizeText(plan.freed)}.`,
  );
  return lines.join("\n");
};

/** Sweeps the recorded outputs. With `dryRun` it reads the disk and changes nothing. */
export const sweep = async (opts: SweepOptions): Promise<SweepResult> => {
  const live = await liveSessions(opts);
  const temps = [...new Set(opts.temps)];
  const files = new Map<string, GcRecord[]>();
  for (const file of await jsonFiles(opts.gcDir))
    files.set(file, parseRecords(await Bun.file(file).text()));
  const entries = await Promise.all(
    [...files.values()].flat().map((r) => entryOf(r, temps, live)),
  );
  const plan = planSweep(entries, {
    now: opts.now,
    ageMaxMs: opts.ageMaxMs,
    sizeMaxBytes: opts.sizeMaxBytes,
  });
  const failed: string[] = [];
  if (!opts.dryRun) {
    const done = new Set<string>();
    for (const v of plan.verdicts) {
      if (v.action === "keep") continue;
      if (v.action === "remove") {
        const real = entries.find((e) => e.record === v.record)?.real;
        try {
          await fs.rm(real as string, { recursive: true, force: true });
        } catch (err) {
          failed.push(`${v.record.path}: ${(err as Error).message}`);
          continue;
        }
      }
      done.add(v.record.path);
    }
    for (const [file, records] of files) {
      if (!records.some((r) => done.has(r.path))) continue;
      // The hook may have added a record since the first read, so the file is read again just before the write.
      const now = parseRecords(await Bun.file(file).text());
      const left = now.filter((r) => !done.has(r.path));
      if (left.length === 0) await fs.rm(file, { force: true });
      else await writeAtomic(file, serialize(left));
    }
    for (const v of plan.verdicts) {
      const project = projectOfWorktree(v.record.path);
      if (v.action === "remove" && v.record.kind === "worktree" && project)
        Bun.spawnSync(["git", "-C", project, "worktree", "prune"]);
    }
  }
  return { plan, failed, text: report(plan, opts.dryRun, failed) };
};

/** True when the process `pid` runs. */
const processRuns = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // `EPERM` means that the process runs under another user.
    return (err as { code?: string }).code === "EPERM";
  }
};

/** The options of the arguments `argv`, or a usage text when an argument is wrong. */
const parseArgs = (
  argv: readonly string[],
): { dryRun: boolean; ending?: string } | string => {
  let dryRun = false;
  let ending: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--ending" && argv[i + 1] !== undefined) {
      ending = argv[i + 1];
      i += 1;
    } else return USAGE;
  }
  return ending === undefined ? { dryRun } : { dryRun, ending };
};

export const main = async (argv: readonly string[]): Promise<number> => {
  const args = parseArgs(argv);
  if (typeof args === "string") {
    console.error(args);
    return 2;
  }
  const home = os.homedir();
  const config = process.env["CLAUDE_CONFIG_DIR"] ?? path.join(home, ".claude");
  const result = await sweep({
    gcDir: gcDirOf(home),
    sessionsDir: path.join(config, "sessions"),
    temps: [os.tmpdir(), "/tmp", process.env["TMPDIR"] ?? ""].filter(Boolean),
    now: Date.now(),
    ageMaxMs: AGE_MAX_MS,
    sizeMaxBytes: SIZE_MAX_BYTES,
    isAlive: processRuns,
    ...args,
  });
  console.log(result.text);
  return result.failed.length > 0 ? 1 : 0;
};
