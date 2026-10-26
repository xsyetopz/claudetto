// The boxes of a `tasks.md`: which box a change ticks.

import { taskLines } from "../../../project/index.ts";

/** The task lines whose box is checked in `after` and was open, or absent, in `before`. */
export const ticked = (
  before: string,
  after: string,
): { id: string; line: string }[] => {
  const was = taskLines(before);
  return [...taskLines(after)]
    .filter(([id, { on }]) => on && !was.get(id)?.on)
    .map(([id, { line }]) => ({ id, line }));
};

/** The first open task of `text`, the text of a `tasks.md`: its id and its text without the box, or `null` when no box is open. */
export const nextOpen = (text: string): { id: string; task: string } | null => {
  for (const [id, { on, line }] of taskLines(text))
    if (!on) return { id, task: line.replace(/^- \[ \] /, "") };
  return null;
};
