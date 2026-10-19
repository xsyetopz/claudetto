// The `.gitignore` entries for the local files that claudetto writes into a project.
// A file that a team shares, such as `jscpd.local.json` or an openspec change, is not in the list.

/** The comment above the block that setup appends. */
export const IGNORE_HEADER =
  "# Local state, cache, and scratch files of claudetto, not for the public repository.";

/** The state of the goal, the handoffs, and the patches, then the config that `just dry` generates, then the local settings. */
export const IGNORE_ENTRIES = [
  "/.claudetto/",
  "/.jscpd.json",
  "/.claude/settings.local.json",
];

/** `text` with the entries that it lacks appended under the header, or `text` when it has all of them. */
export const withIgnores = (text: string): string => {
  const have = new Set(text.split("\n").map((l) => l.trim()));
  const missing = IGNORE_ENTRIES.filter((e) => !have.has(e));
  if (!missing.length) return text;
  const gap = text === "" ? "" : text.endsWith("\n") ? "\n" : "\n\n";
  return `${text}${gap}${IGNORE_HEADER}\n${missing.join("\n")}\n`;
};
