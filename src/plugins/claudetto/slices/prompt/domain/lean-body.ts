// The tailored text of the short prompt of Claude Code 2.1.302 (`CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1`), and the block of a subagent.
// The `prompt.compose` hook replaces the `lean_body` section with `LEAN_BODY`.
// The vanilla section of 2.1.302 holds only the `# Harness` rules (`tests/claudetto/prompt/fixtures/lean_body.txt`).
// `LEAN_BODY` keeps the harness rules that no other section of it says, and adds the rules of the sections that the short prompt lacks.
// The texts come from `prompts/` of the slice through `just generate`.
// An output style reaches the model as a message and holds only role, tone, and format, so the rules are here.

import {
  ACTIONS,
  BLOCK_LINE,
  BLOCKS,
  CLEANUP_LINE,
  COUNTS,
  DOING_TASKS,
  EVIDENCE_LINE,
  INTRO,
  SYSTEM,
  TOOLS,
  VERIFICATION,
  VERIFY_LINE,
} from "../prompts.ts";

/** The id of the section that the short prompt holds, and that this slice replaces. */
export const LEAN_BODY_SECTION = "lean_body";

const section = (tag: string, text: string): string =>
  `<${tag}>\n${text.trim()}\n</${tag}>`;

export const LEAN_BODY = [
  section("intro", INTRO),
  section("doing_tasks", DOING_TASKS),
  section("system", SYSTEM),
  section("blocks", BLOCKS),
  section("verification", VERIFICATION),
  section("actions", ACTIONS),
  section("tools", TOOLS),
  section("counts", COUNTS),
].join("\n\n");

/** The first line of the block that a subagent gets. A task prompt that has it gets no second block. */
export const BLOCK_OPEN = "<claudetto_notes>";

/** The task prompt with the rules for a subagent at its end, one time. A subagent does not get `LEAN_BODY`. */
export const withBlock = (prompt: string): string =>
  prompt.includes(BLOCK_OPEN)
    ? prompt
    : `${prompt}\n\n${BLOCK_OPEN}\n${[VERIFY_LINE, BLOCK_LINE, EVIDENCE_LINE, CLEANUP_LINE].map((l) => l.trim()).join("\n")}\n</claudetto_notes>`;
