// The parsers of the capability files of the spec store: a capability spec and
// a delta file. Each parser takes the text of one file and gives the typed
// value, or the errors with their line numbers. Plain data and pure functions only.
// A requirement keeps its text verbatim, so the writer gives back the same lines.

import type {
  CapabilitySpec,
  DeltaFile,
  FormatError,
  Rename,
  Requirement,
  Result,
  Scenario,
} from "./formats.ts";
import {
  fail,
  fenceMask,
  group,
  type Line,
  result,
  toLines,
  trimBlank,
} from "./lines.ts";

interface Block {
  header: Line;
  name: string;
  body: Line[];
}

type DeltaSection = "ADDED" | "MODIFIED" | "REMOVED" | "RENAMED";

const DELTA_SECTIONS: readonly string[] = [
  "ADDED",
  "MODIFIED",
  "REMOVED",
  "RENAMED",
];

const REQUIREMENT = /^### Requirement: (\S.*)$/;
const SCENARIO = /^#### Scenario: (\S.*)$/;
/** The `AND` lines have no entry here: they stay in the lines of their scenario. */
const CLAUSE = /^(?:[-*]\s+)?(?:\*\*)?(WHEN|THEN)(?:\*\*)?:?\s*(.*)$/;
const RENAME = /^(?:[-*]\s+)?(?:\*\*)?(FROM|TO)(?:\*\*)?:\s*(\S.*)$/;

const isDeltaSection = (name: string): name is DeltaSection =>
  DELTA_SECTIONS.includes(name);

/**
 * Splits the lines into requirement blocks. A heading of level 1 to 3 outside a
 * fenced code block ends a block. A line in a fence is text of the open block.
 */
const splitBlocks = (
  lines: Line[],
): { blocks: Block[]; errors: FormatError[] } => {
  const blocks: Block[] = [];
  const errors: FormatError[] = [];
  const fenced = fenceMask(lines);
  let open: Block | null = null;
  for (const [i, line] of lines.entries()) {
    if (fenced[i]) {
      open?.body.push(line);
      continue;
    }
    const header = REQUIREMENT.exec(line.text);
    if (header !== null) {
      open = { header: line, name: group(header, 1).trim(), body: [] };
      blocks.push(open);
    } else if (/^#{1,3}\s/.test(line.text)) {
      open = null;
      if (/^###\s/.test(line.text)) {
        errors.push(fail(line.line, "a `###` heading must be a requirement"));
      }
    } else if (open !== null) {
      open.body.push(line);
    }
  }
  return { blocks, errors };
};

const parseBlock = (
  block: Block,
): { requirement: Requirement; errors: FormatError[] } => {
  const errors: FormatError[] = [];
  const text: string[] = [];
  const scenarios: Scenario[] = [];
  const fenced = fenceMask(block.body);
  let scenario: Scenario | null = null;
  for (const [i, line] of block.body.entries()) {
    const inFence = fenced[i] === true;
    const head = inFence ? null : SCENARIO.exec(line.text);
    if (head !== null) {
      scenario = {
        name: group(head, 1).trim(),
        lines: [],
        whenLines: [],
        thenLines: [],
      };
      scenarios.push(scenario);
      continue;
    }
    if (!inFence && /^####\s/.test(line.text)) {
      errors.push(fail(line.line, "a `####` heading must be a scenario"));
    }
    if (scenario === null) {
      text.push(line.text);
      continue;
    }
    scenario.lines.push(line.text);
    const clause = inFence ? null : CLAUSE.exec(line.text);
    if (clause !== null) {
      const target =
        group(clause, 1) === "WHEN" ? scenario.whenLines : scenario.thenLines;
      target.push(group(clause, 2).trim());
    }
  }
  const requirement = {
    name: block.name,
    text: trimBlank(text).join("\n"),
    scenarios: scenarios.map((s) => ({ ...s, lines: trimBlank(s.lines) })),
  };
  return { requirement, errors };
};

const requirementsOf = (
  lines: Line[],
): { value: Requirement[]; errors: FormatError[] } => {
  const split = splitBlocks(lines);
  const errors = [...split.errors];
  const value: Requirement[] = [];
  const names = new Set<string>();
  for (const block of split.blocks) {
    const parsed = parseBlock(block);
    errors.push(...parsed.errors);
    if (names.has(block.name)) {
      errors.push(
        fail(block.header.line, `duplicate requirement \`${block.name}\``),
      );
    }
    names.add(block.name);
    value.push(parsed.requirement);
  }
  return { value, errors };
};

const renamesOf = (
  lines: Line[],
): { value: Rename[]; errors: FormatError[] } => {
  const value: Rename[] = [];
  const errors: FormatError[] = [];
  let from: { name: string; line: number } | null = null;
  for (const line of lines) {
    const m = RENAME.exec(line.text);
    if (m === null) {
      continue;
    }
    if (m[1] === "FROM") {
      if (from !== null) {
        errors.push(fail(from.line, "a `FROM:` line has no `TO:` line"));
      }
      from = { name: group(m, 2).trim(), line: line.line };
    } else if (from === null) {
      errors.push(fail(line.line, "a `TO:` line has no `FROM:` line"));
    } else {
      value.push({ from: from.name, to: group(m, 2).trim() });
      from = null;
    }
  }
  if (from !== null) {
    errors.push(fail(from.line, "a `FROM:` line has no `TO:` line"));
  }
  return { value, errors };
};

/** Parses a capability spec: `### Requirement:` blocks with `#### Scenario:` blocks. */
export const parseSpec = (
  text: string,
): Result<CapabilitySpec, FormatError> => {
  const parsed = requirementsOf(toLines(text));
  return result({ requirements: parsed.value }, parsed.errors);
};

/** Parses a delta file with the sections `ADDED`, `MODIFIED`, `REMOVED`, and `RENAMED`. */
export const parseDelta = (text: string): Result<DeltaFile, FormatError> => {
  const errors: FormatError[] = [];
  const sections: Record<DeltaSection, Line[]> = {
    ADDED: [],
    MODIFIED: [],
    REMOVED: [],
    RENAMED: [],
  };
  const seen = new Set<string>();
  // "skip" holds the body of a section that is unknown or repeated, so that it
  // gives one error and no more.
  let current: DeltaSection | "skip" | null = null;
  const all = toLines(text);
  const fenced = fenceMask(all);
  for (const [i, line] of all.entries()) {
    const inFence = fenced[i] === true;
    const heading = inFence ? null : /^## (\S.*)$/.exec(line.text);
    if (!inFence && /^# /.test(line.text)) {
      continue;
    }
    if (heading !== null) {
      const name = group(heading, 1).trim();
      if (!isDeltaSection(name)) {
        errors.push(fail(line.line, "an unknown section of a delta file"));
        current = "skip";
      } else if (seen.has(name)) {
        errors.push(fail(line.line, `duplicate section \`${name}\``));
        current = "skip";
      } else {
        seen.add(name);
        current = name;
      }
    } else if (current === null) {
      if (line.text.trim() !== "") {
        errors.push(fail(line.line, "text outside a section of a delta file"));
      }
    } else if (current !== "skip") {
      sections[current].push(line);
    }
  }
  const added = requirementsOf(sections.ADDED);
  const modified = requirementsOf(sections.MODIFIED);
  const removed = requirementsOf(sections.REMOVED);
  const renamed = renamesOf(sections.RENAMED);
  errors.push(
    ...added.errors,
    ...modified.errors,
    ...removed.errors,
    ...renamed.errors,
  );
  return result(
    {
      added: added.value,
      modified: modified.value,
      removed: removed.value.map((r) => r.name),
      renamed: renamed.value,
    },
    errors,
  );
};
