// The check of `dotclaude-sandbox --check-frontmatter`.
// Claude Code writes a debug line for each unknown or ignored frontmatter field of a plugin file.
// The sandbox runs one headless session with `--debug-file`, and this file reads the log.

/** The lines of a debug log that name an unknown or ignored frontmatter field. */
export function unknownFieldLines(text) {
  return text
    .split("\n")
    .filter((l) =>
      /unknown (?:frontmatter )?field|unrecognized field/i.test(l),
    );
}

/** The lines to print for a log, and the exit code: 1 when the log names a field. */
export function report(log, text) {
  const hits = unknownFieldLines(text);
  return {
    lines: [
      `Debug log: ${log} (${text.split("\n").length} lines)`,
      ...hits,
      hits.length === 0
        ? "No unknown frontmatter field."
        : `${hits.length} lines name an unknown field.`,
    ],
    code: hits.length === 0 ? 0 : 1,
  };
}
