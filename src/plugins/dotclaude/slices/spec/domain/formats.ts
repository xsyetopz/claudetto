// The types of the Markdown formats of the spec store.
// Plain data only: no I/O and no host API.

/** A line of a format error, with its 1-based line number. */
export interface FormatError {
  line: number;
  message: string;
}

/** The result of a parser or a checker, with a value or the failures. */
export type Result<T, E> = { ok: true; value: T } | { ok: false; errors: E[] };

/** The sections of a package brief, in order. */
export const PACKAGE_SECTIONS = [
  "Goal",
  "Context",
  "Steps",
  "Acceptance",
  "Boundaries",
] as const;
