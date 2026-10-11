// The rules that every model shares, as system prompt sections of `prompt.compose`.
// They take the place of the engineering sections of Claude Code that the variant replaces.
// An output style reaches the model as a message and holds only role, tone, and format, so the rules are here.
// The texts come from `src/plugins/dotclaude/features/prompt/texts.ts/` through `just generate`.
// The files have no `node:` import, so the hooks module can load them.

import {
  ACTIONS,
  BLOCK_LINE,
  BLOCKS,
  COUNTS,
  DOING_TASKS,
  EVIDENCE_LINE,
  SYSTEM,
  TOOLS,
  VERIFICATION,
} from "./texts.ts";

// The evidence line of design D30, which the `actions` section also holds, and the block line of design D15, the short form of the `blocks` section.
// A subagent does not get these sections, so the block of each model carries both lines.
export { BLOCK_LINE, EVIDENCE_LINE };

/** The section with the `tag` and the `text`. */
const section = (tag: string, text: string): string =>
  `<${tag}>\n${text}\n</${tag}>`;

/** The shared sections, in prompt order. */
export const SHARED_SECTIONS = [
  section("doing_tasks", DOING_TASKS),
  section("system", SYSTEM),
  section("blocks", BLOCKS),
  section("verification", VERIFICATION),
  section("actions", ACTIONS),
  section("tools", TOOLS),
  section("counts", COUNTS),
];
