// The Chicago Title Case of the headings of a Markdown file (task 10.11).
// Only an ATX heading changes. The front matter, a fenced code block, and each other line stay as they are.

import { titleCase } from "../../../kernel/title.ts";

/** An ATX heading: up to 3 spaces, 1 to 6 `#`, the text, and an optional closing run of `#`. */
const HEADING = /^( {0,3}#{1,6}[ \t]+)(.*?)((?:[ \t]+#+)?[ \t]*\r?)$/;

const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/** The line index after the front matter (`---` on line 1 to the next `---` or `...`), or 0 when the file has none. */
const bodyStart = (lines: readonly string[]): number => {
  if (lines[0]?.trimEnd() !== "---") return 0;
  const end = lines.findIndex(
    (line, i) => i > 0 && ["---", "..."].includes(line.trimEnd()),
  );
  return end === -1 ? 0 : end + 1;
};

/** The fence that stays open after `line`, given the fence open before it (`""` for none). */
const nextFence = (line: string, fence: string): string => {
  const mark = FENCE.exec(line)?.[1] ?? "";
  if (!fence) return mark;
  // A closing fence uses the same character, is at least as long, and has no text after it.
  const closes =
    mark[0] === fence[0] && mark.length >= fence.length && line.trim() === mark;
  return closes ? "" : fence;
};

const titleLine = (line: string): string => {
  const [, open = "", title = "", close = ""] = HEADING.exec(line) ?? [];
  return open && title.trim() ? open + titleCase(title) + close : line;
};

/** `text` with each ATX heading in Chicago Title Case, and how many headings changed. */
export const titleHeadings = (
  text: string,
): { text: string; changed: number } => {
  const lines = text.split("\n");
  const start = bodyStart(lines);
  let changed = 0;
  let fence = "";
  const out = lines.map((line, i) => {
    if (i < start) return line;
    const inFence = fence !== "" || FENCE.test(line);
    fence = nextFence(line, fence);
    if (inFence) return line;
    const fixed = titleLine(line);
    if (fixed !== line) changed++;
    return fixed;
  });
  return { text: out.join("\n"), changed };
};
