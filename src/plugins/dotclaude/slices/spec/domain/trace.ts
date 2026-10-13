// The requirement trace of a diff: the added lines in, the findings out.
// Plain data and pure functions only. The adapter reads the diff and the set of known IDs.
//
// A citation is `[REQ-<n>]` or `[REQ-<n>, REQ-<m>]` in a comment, on the same line as the code that it covers.
// A finding is an orphan (a cited ID that no requirement has) or an uncited line (a non-trivial added line with no citation).

/** One added line of a diff: the file, the line number in the new file, and the text. */
export interface AddedLine {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}

/** One finding of the trace. An `orphan` has the `id` that no requirement has. */
export interface Finding {
  readonly kind: "orphan" | "uncited";
  readonly file: string;
  readonly line: number;
  readonly text: string;
  readonly id?: number;
}

/** The count of each kind of finding. */
export interface Counts {
  readonly orphans: number;
  readonly uncited: number;
}

/** A citation: `[REQ-12]` or `[REQ-12, REQ-14]`. */
const CITATION = /\[REQ-(?:0|[1-9]\d*)(?:\s*,\s*REQ-(?:0|[1-9]\d*))*\]/g;
const ONE_ID = /REQ-(0|[1-9]\d*)/g;

/** The IDs that `text` cites, in order. An ID that the text cites twice is in the list twice. */
export const citedIds = (text: string): number[] =>
  [...text.matchAll(CITATION)].flatMap((c) =>
    [...c[0].matchAll(ONE_ID)].map((m) => Number(m[1])),
  );

/** A line with only a comment: a line, block, HTML, or `#` comment, or the middle or end of a block comment. */
const COMMENT =
  /^(?:\/\/|#(?:[\s!#]|$)|\/\*|\*\/|\*(?:\s|$)|<!--|-->|--(?:\s|$))/;
/** A line with no letter, digit, or underscore: blank, or only brackets and punctuation. */
const PUNCTUATION = /^[^\p{L}\p{N}_]*$/u;
/** An import or a re-export: `import ...`, `export {`, `export * from`, `export ... from "m"`, `from m import`, `#include`. */
const IMPORT =
  /^(?:import(?:\s|$)|export\s+(?:type\s+)?[*{]|export\b.*\sfrom\s+["']|from\s+\S+\s+import\b|#include\b)/;
/** An import or a re-export that opens a list and does not close it on the same line. */
const IMPORT_OPEN =
  /^(?:import(?:\s|$)|export\s+(?:type\s+)?\{|from\s+\S+\s+import\b).*[({]\s*$/;
/** The line that closes an open import list. */
const LIST_CLOSE = /^[})]/;

/**
 * True when `text` is a trivial line, which needs no citation.
 * A line is trivial when, without the indent, it is:
 * - blank,
 * - a comment only (`//`, `#`, `/*`, `*`, `*\/`, `<!--`, `-->`, or `--`),
 * - only brackets and punctuation (it has no letter, digit, or underscore), or
 * - an import or a re-export (`import`, `export {`, `export * from`, `export ... from`, `from m import`, `#include`).
 * The lines inside an import list that spans lines are also trivial. `traceLines` finds them.
 */
export const isTrivial = (text: string): boolean => {
  const line = text.trim();
  return PUNCTUATION.test(line) || COMMENT.test(line) || IMPORT.test(line);
};

/** The lines that `diff` adds, from the output of `git diff --unified=0`, with the file and the new line number. */
export const addedLines = (diff: string): AddedLine[] => {
  const added: AddedLine[] = [];
  let file: string | null = null;
  let inHunk = false;
  let next = 0;
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("diff --git ")) {
      inHunk = false;
      file = null;
    } else if (!inHunk && raw.startsWith("+++ ")) {
      const name = raw.slice(4).split("\t")[0] ?? "";
      file = name.startsWith("b/") ? name.slice(2) : null;
    } else if (raw.startsWith("@@")) {
      inHunk = true;
      next = Number(/\+(\d+)/.exec(raw)?.[1] ?? 0);
    } else if (inHunk && file !== null && raw.startsWith("+")) {
      added.push({ file, line: next, text: raw.slice(1).replace(/\r$/, "") });
      next += 1;
    }
  }
  return added;
};

/** True when the trace skips `file`: Markdown, JSON, and lock files. The adapter also skips the files that `.gitattributes` marks generated. */
export const skipsPath = (file: string): boolean => {
  const name = file.split("/").at(-1) ?? file;
  return (
    /\.(?:md|mdx|markdown|json|jsonc|json5|jsonl)$/i.test(name) ||
    /\.lockb?$/.test(name) ||
    name === "go.sum" ||
    name === "pnpm-lock.yaml"
  );
};

/**
 * The findings of `lines`, in the order of the lines.
 * `known` holds the numbers of the requirements that exist.
 * A comment line can cite an ID, and a cited ID that is not in `known` is an orphan, also on a trivial line.
 */
export const traceLines = (
  lines: readonly AddedLine[],
  known: ReadonlySet<number>,
): Finding[] => {
  const findings: Finding[] = [];
  let listOpen = false;
  let before: AddedLine | undefined;
  for (const l of lines) {
    if (before?.file !== l.file || before.line + 1 !== l.line) listOpen = false;
    before = l;
    const cited = citedIds(l.text);
    for (const id of cited)
      if (!known.has(id)) findings.push({ kind: "orphan", ...place(l), id });
    const trimmed = l.text.trim();
    const inList = listOpen;
    if (inList) listOpen = !LIST_CLOSE.test(trimmed);
    else listOpen = IMPORT_OPEN.test(trimmed);
    if (!(inList || cited.length > 0 || isTrivial(l.text)))
      findings.push({ kind: "uncited", ...place(l) });
  }
  return findings;
};

const place = (l: AddedLine): Pick<Finding, "file" | "line" | "text"> => ({
  file: l.file,
  line: l.line,
  text: l.text.trim(),
});

/** The count of each kind of finding. */
export const countOf = (findings: readonly Finding[]): Counts => ({
  orphans: findings.filter((f) => f.kind === "orphan").length,
  uncited: findings.filter((f) => f.kind === "uncited").length,
});
