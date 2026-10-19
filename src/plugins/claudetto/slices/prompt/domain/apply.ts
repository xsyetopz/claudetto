// The transform of a built-in section, and the debug lines for an anchor that finds nothing.
// Both are pure functions, so the mod handlers and the tests share them.

import { PARTS_OF, TRANSFORMS } from "../transforms/index.ts";
import { missedParts } from "../transforms/parts.ts";

/** The built-in text of a section after its transform, or the text unchanged when no transform has the id. */
export const transformText = (id: string, text: string): string =>
  TRANSFORMS.get(id)?.(text) ?? text;

/** One debug log line for each anchor of the transform of `id` that finds nothing in `text`. */
export const missLines = (id: string, text: string): string[] =>
  missedParts(text, PARTS_OF.get(id) ?? []).map(
    (p) =>
      `prompt transform: the anchor \`${p.anchor}\` of the section \`${id}\` found nothing, so that part of the built-in text is unchanged`,
  );
