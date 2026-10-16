// The plan of one sweep: which recorded outputs go, which stay, and which the sweep refuses to touch.
// The plan is a pure function of the entries, so a test needs no disk.
// The adapter reads the disk (the real path, the size, and the sessions that run) and removes the paths of the plan.

import { sep } from "node:path";
import type { GcRecord } from "./record.ts";

/** A recorded output with the facts that the adapter read from the disk. */
export interface Entry {
  readonly record: GcRecord;
  /** The real path of the output, or null when nothing exists at the path. */
  readonly real: string | null;
  /** True when the path itself is a symlink. */
  readonly isLink: boolean;
  /** The size in bytes. A symlink inside the output counts as a link, not as its target. */
  readonly size: number;
  /** The allowed roots for this record, as real paths. */
  readonly roots: readonly string[];
  /** True when a live session or a running job needs the output. */
  readonly held: boolean;
}

/** What the sweep does with one entry. */
export type Action = "remove" | "keep" | "skip" | "gone";

export interface Verdict {
  readonly record: GcRecord;
  readonly action: Action;
  /** The reason in a few words, such as `older than the age bound`. */
  readonly reason: string;
  readonly size: number;
}

export interface Plan {
  readonly verdicts: readonly Verdict[];
  /** The count of paths that the plan removes. */
  readonly removed: number;
  /** The bytes that the plan frees. */
  readonly freed: number;
}

export interface Bounds {
  readonly now: number;
  readonly ageMaxMs: number;
  readonly sizeMaxBytes: number;
}

/** True when `path` is `dir` or is inside it. */
export const isInside = (dir: string, path: string): boolean => {
  const base = dir.endsWith(sep) ? dir : `${dir}${sep}`;
  return path === dir || path.startsWith(base);
};

/** True when `path` is strictly inside one of `roots`. A root itself is never an output. */
const inRoots = (roots: readonly string[], path: string): boolean =>
  roots.some((root) => path !== root && isInside(root, path));

const verdict = (entry: Entry, action: Action, reason: string): Verdict => ({
  record: entry.record,
  action,
  reason,
  size: entry.size,
});

/** The first answer for an entry, before the age and the size count: a refusal, a keep, or undefined for a candidate. */
const screen = (entry: Entry): Verdict | undefined => {
  if (entry.real === null) return verdict(entry, "gone", "the path is gone");
  if (entry.isLink) return verdict(entry, "skip", "the path is a symlink");
  if (!inRoots(entry.roots, entry.real))
    return verdict(entry, "skip", "outside each allowed root");
  if (entry.held) return verdict(entry, "keep", "a live session needs it");
  return undefined;
};

/**
 * Plans the sweep.
 * A candidate is an entry that passes `screen`.
 * A candidate older than `ageMaxMs` goes.
 * Then the oldest of the rest go until their total size is at most `sizeMaxBytes`.
 * A path that holds a path that stays, or sits in one, also stays, and a path inside a path that goes is counted once, with the parent.
 */
export const planSweep = (entries: readonly Entry[], bounds: Bounds): Plan => {
  const screened = entries.map((e) => ({ entry: e, first: screen(e) }));
  const kept = screened.flatMap((s) =>
    s.first && s.first.action === "keep" ? [s.entry.real as string] : [],
  );
  const candidates = screened
    .filter((s) => s.first === undefined)
    .map((s) => s.entry)
    .sort((a, b) => a.record.time - b.record.time);
  const goes = new Set<Entry>();
  const why = new Map<Entry, string>();
  for (const e of candidates) {
    if (bounds.now - e.record.time > bounds.ageMaxMs) {
      goes.add(e);
      why.set(e, "older than the age bound");
    }
  }
  let total = candidates
    .filter((e) => !goes.has(e))
    .reduce((sum, e) => sum + e.size, 0);
  for (const e of candidates) {
    if (total <= bounds.sizeMaxBytes) break;
    if (goes.has(e)) continue;
    goes.add(e);
    why.set(e, "over the size bound");
    total -= e.size;
  }
  const real = (e: Entry): string => e.real as string;
  const verdicts: Verdict[] = [];
  let removed = 0;
  let freed = 0;
  for (const s of screened) {
    if (s.first) {
      verdicts.push(s.first);
      continue;
    }
    const e = s.entry;
    if (!goes.has(e)) {
      verdicts.push(verdict(e, "keep", "inside the age and size bounds"));
    } else if (kept.some((k) => isInside(k, real(e)) || isInside(real(e), k))) {
      verdicts.push(verdict(e, "keep", "holds or sits in a path that stays"));
    } else if (
      [...goes].some(
        (o) => o !== e && isInside(real(o), real(e)) && real(o) !== real(e),
      )
    ) {
      verdicts.push(verdict(e, "remove", "inside a path that goes"));
    } else {
      verdicts.push(verdict(e, "remove", why.get(e) as string));
      removed += 1;
      freed += e.size;
    }
  }
  return { verdicts, removed, freed };
};

/** The size as text, with the unit: `512 B`, `3.2 MiB`. */
export const sizeText = (bytes: number): string => {
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return i === 0 ? `${value} B` : `${value.toFixed(1)} ${units[i]}`;
};
