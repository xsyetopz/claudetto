// The pure parts of the ask on an edit of the `[Unreleased]` section of `CHANGELOG.md`.
// The check reads the structure of the Markdown: the level 2 heading `[Unreleased]` and the lines up to the next heading of level 2 or 1.
// It compares the section before the edit with the section after it, so a word in a line decides nothing.

import { CHANGELOG_FILE } from "../limits.ts";
import { CHANGELOG_ASK } from "../prompts.ts";

/** The heading of the open section, as Keep a Changelog writes it: `## [Unreleased]`. */
const UNRELEASED_HEADING = /^##[ \t]+\[?unreleased\]?[ \t]*$/i;

/** A heading of level 1 or 2, which ends a section of level 2. */
const SECTION_END = /^#{1,2}[ \t]/;

/** The fence of a code block that a line opens or closes, or `null`. */
const fenceOf = (line: string): string | null =>
  /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1]?.[0] ?? null;

/** The text of the `[Unreleased]` section of `text` with its heading, or `null` when `text` has none. A line in a code block is no heading. */
export const unreleasedSection = (text: string): string | null => {
  const lines = text.split("\n");
  let fence: string | null = null;
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    const mark = fenceOf(line);
    if (mark !== null) {
      fence = fence === null ? mark : fence === mark ? null : fence;
      continue;
    }
    if (fence !== null) continue;
    if (start === -1) {
      if (UNRELEASED_HEADING.test(line)) start = i;
    } else if (SECTION_END.test(line)) {
      return lines.slice(start, i).join("\n");
    }
  }
  return start === -1 ? null : lines.slice(start).join("\n");
};

/** One text edit, as `Edit` and `MultiEdit` give it. */
interface TextEdit {
  old_string?: unknown;
  new_string?: unknown;
  replace_all?: unknown;
}

/** The text after one edit, or `null` when the text to replace is not in `text`. */
const applyEdit = (text: string, edit: TextEdit): string | null => {
  const { old_string: from, new_string: to } = edit;
  if (typeof from !== "string" || typeof to !== "string" || from === "")
    return null;
  if (!text.includes(from)) return null;
  return edit.replace_all === true
    ? text.split(from).join(to)
    : text.replace(from, () => to);
};

/** The text of the file after the call, or `null` when the call is not a write that the tool would make. `before` is the file now, or `null` when it is absent. */
export const textAfter = (
  tool: string,
  input: Record<string, unknown>,
  before: string | null,
): string | null => {
  if (tool === "Write")
    return typeof input["content"] === "string" ? input["content"] : null;
  if (before === null) return null;
  const edits: unknown[] =
    tool === "MultiEdit" && Array.isArray(input["edits"])
      ? input["edits"]
      : tool === "Edit"
        ? [input]
        : [];
  if (edits.length === 0) return null;
  let text: string | null = before;
  for (const edit of edits) {
    if (text === null) return null;
    text = applyEdit(text, edit as TextEdit);
  }
  return text;
};

/** True when `file` is a `CHANGELOG.md`. */
export const isChangelog = (file: unknown): boolean =>
  typeof file === "string" &&
  (file === CHANGELOG_FILE || file.endsWith(`/${CHANGELOG_FILE}`));

/** True when the call changes the `[Unreleased]` section of the file whose text is `before`. */
export const changesUnreleased = (
  tool: string,
  input: Record<string, unknown>,
  before: string | null,
): boolean => {
  const after = textAfter(tool, input, before);
  if (after === null) return false;
  return unreleasedSection(before ?? "") !== unreleasedSection(after);
};

/** The ask text for a version `version` with no tag, which is in the file `manifest`. */
export const changelogReason = (version: string, manifest: string): string =>
  CHANGELOG_ASK({ version, manifest: `\`${manifest}\`` });
