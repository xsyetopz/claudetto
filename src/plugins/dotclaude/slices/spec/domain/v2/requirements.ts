// The requirement IDs and the open markers of schema 2: the `### REQ-<n>: <name>` headings, the next free ID, the markers, and the coverage of the requirements by the packages.
// Plain data and pure functions only.

import type { FormatError } from "../formats.ts";
import { fail, fenceMask, group, toLines } from "../lines.ts";

/** A requirement heading: `### REQ-<n>: <name>`, where `<n>` is a whole number with no leading zero. */
const REQ_HEADING = /^### REQ-(0|[1-9]\d*): (\S.*)$/;
/** A line that starts a requirement heading, so a malformed one is an error and not text. */
const REQ_START = /^###\s+REQ\b/;
/** An open question: `[NEEDS CLARIFICATION: <question>]`. */
const MARKER = /\[NEEDS CLARIFICATION:([^\]]*)\]/g;

/** One requirement of a file: its number, its name, and the line of its heading. */
export interface Requirement {
  readonly id: number;
  readonly name: string;
  readonly line: number;
}

/**
 * The requirements of `text`, and the errors of its headings.
 * A heading that starts with `### REQ` and does not match the format is an error, and so is an ID that repeats in the file.
 * A heading inside a fenced code block is text.
 */
export const requirementsOf = (
  text: string,
): { requirements: Requirement[]; errors: FormatError[] } => {
  const lines = toLines(text);
  const fenced = fenceMask(lines);
  const requirements: Requirement[] = [];
  const errors: FormatError[] = [];
  for (const [i, line] of lines.entries()) {
    if (fenced[i] || !REQ_START.test(line.text)) continue;
    const m = REQ_HEADING.exec(line.text);
    if (m === null) {
      errors.push(
        fail(line.line, "a requirement heading is `### REQ-<n>: <name>`"),
      );
      continue;
    }
    const id = Number(group(m, 1));
    if (requirements.some((r) => r.id === id))
      errors.push(fail(line.line, `duplicate requirement \`REQ-${id}\``));
    requirements.push({ id, name: group(m, 2).trim(), line: line.line });
  }
  return { requirements, errors };
};

/** The IDs that appear more than once in `ids`, each once, in the order of the first repeat. */
export const duplicateIds = (ids: readonly number[]): number[] => {
  const seen = new Set<number>();
  const repeated = new Set<number>();
  for (const id of ids) {
    if (seen.has(id)) repeated.add(id);
    seen.add(id);
  }
  return [...repeated];
};

/**
 * The next free ID: one more than the largest of `used`.
 * The caller must pass the IDs of `specs/`, of each open change, and of the archive, so that a removed ID is not used again.
 * An empty list gives `1`.
 */
export const nextId = (used: readonly number[]): number =>
  used.length === 0 ? 1 : Math.max(...used) + 1;

/** One open marker of a file: its line and its question. */
export interface Marker {
  readonly line: number;
  readonly question: string;
}

/** The open markers of `text`, in the order of the lines. */
export const markersOf = (text: string): Marker[] =>
  toLines(text).flatMap((line) =>
    [...line.text.matchAll(MARKER)].map((m) => ({
      line: line.line,
      question: group(m, 1).trim(),
    })),
  );

/** The coverage of the requirements `ids` by the `satisfies` lists of the packages `satisfied`. */
export interface Coverage {
  /** Each `REQ-<n>` of `ids` that no package satisfies. */
  readonly uncovered: string[];
  /** Each `satisfies` entry that is not a `REQ-<n>` of `ids`. */
  readonly unknown: string[];
}

/** The coverage check of `plan`: each requirement has a package, and each `satisfies` entry names a requirement. */
export const coverageOf = (
  ids: readonly number[],
  satisfied: readonly string[],
): Coverage => {
  const known = new Set(ids.map((id) => `REQ-${id}`));
  return {
    uncovered: [...known].filter((ref) => !satisfied.includes(ref)),
    unknown: satisfied.filter((ref) => !known.has(ref)),
  };
};
