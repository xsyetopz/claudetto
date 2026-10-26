// The `.gitignore` entries for the local files that claudetto writes into a project. A file that a team shares is not in the list.
const IGNORE_HEADER =
  "# Local state, cache, and scratch files of claudetto, not for the public repository.";
const IGNORE_ENTRIES = [
  "/.claudetto/",
  "/.jscpd.json",
  "/.claude/settings.local.json",
];

/** `text` with the `lines` that it lacks appended under `header`, or `text` when it has all of them. */
export const withLines = (
  text: string,
  header: string,
  lines: readonly string[],
): string => {
  const have = new Set(text.split("\n").map((l) => l.trim()));
  const missing = lines.filter((e) => !have.has(e));
  if (!missing.length) return text;
  const gap = text === "" ? "" : text.endsWith("\n") ? "\n" : "\n\n";
  return `${text}${gap}${header}\n${missing.join("\n")}\n`;
};

export const withIgnores = (text: string): string =>
  withLines(text, IGNORE_HEADER, IGNORE_ENTRIES);

export const withLocalNotes = (text: string): string =>
  withLines(text, "# Personal notes of the user for this project.", [
    "/CLAUDE.local.md",
  ]);
