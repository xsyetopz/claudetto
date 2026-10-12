// The delta rules of one capability: a delta file applied to its spec.
// Pure: the input spec is not changed, and the result is a new spec or the failures.

import type {
  CapabilitySpec,
  DeltaFile,
  Requirement,
  Result,
} from "./formats.ts";

export type DeltaSection = "RENAMED" | "REMOVED" | "MODIFIED" | "ADDED";

/** One delta that does not apply: a name that is missing, or a name that exists already. */
export interface DeltaFailure {
  section: DeltaSection;
  name: string;
  reason: "missing" | "exists";
}

/**
 * Applies the deltas in the order `RENAMED`, `REMOVED`, `MODIFIED`, `ADDED`.
 * A failed delta is skipped, and the result is an error that lists every
 * failure, so no new spec is given.
 */
export const applyDelta = (
  spec: CapabilitySpec,
  delta: DeltaFile,
): Result<CapabilitySpec, DeltaFailure> => {
  const failures: DeltaFailure[] = [];
  let list: Requirement[] = [...spec.requirements];
  const indexOf = (name: string): number =>
    list.findIndex((r) => r.name === name);
  const fail = (
    section: DeltaSection,
    name: string,
    reason: "missing" | "exists",
  ): void => {
    failures.push({ section, name, reason });
  };

  for (const { from, to } of delta.renamed) {
    const i = indexOf(from);
    if (i < 0) {
      fail("RENAMED", from, "missing");
    } else if (indexOf(to) >= 0) {
      fail("RENAMED", to, "exists");
    } else {
      list = list.map((r, j) => (j === i ? { ...r, name: to } : r));
    }
  }
  for (const name of delta.removed) {
    const i = indexOf(name);
    if (i < 0) {
      fail("REMOVED", name, "missing");
    } else {
      list = list.filter((_, j) => j !== i);
    }
  }
  for (const req of delta.modified) {
    const i = indexOf(req.name);
    if (i < 0) {
      fail("MODIFIED", req.name, "missing");
    } else {
      list = list.map((r, j) => (j === i ? req : r));
    }
  }
  for (const req of delta.added) {
    if (indexOf(req.name) >= 0) {
      fail("ADDED", req.name, "exists");
    } else {
      list = [...list, req];
    }
  }
  return failures.length === 0
    ? { ok: true, value: { requirements: list } }
    : { ok: false, errors: failures };
};
