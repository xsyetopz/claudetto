// The choice of a variant for a model id, and the splice of a variant into the section list of `prompt.compose`.
// Both are pure functions, so the hooks module and the tests share them.

import { BLOCK_OPEN, spawnBlock, variantSections } from "./variants.mjs";

/** The ids of the Claude Code sections that a variant replaces. Any other id passes on unchanged. */
export const KNOWN_SECTIONS = [
  "intro",
  "system",
  "doing_tasks",
  "actions",
  "tools",
  "tone",
  "lean_body",
];

/** The variant key of a model id or alias (`claude-haiku-5-5`, `haiku`), or null for a model with no variant. */
export function variantKey(model) {
  const id = String(model ?? "").toLowerCase();
  return (
    ["opus", "sonnet", "haiku", "fable"].find((k) => id.includes(k)) ?? null
  );
}

/**
 * The section list with the known sections replaced by the variant sections.
 * The variant sits where the first known section was, and the unknown sections keep their order.
 */
export function composeSections(sections, key) {
  const out = [];
  let placed = false;
  for (const s of sections) {
    if (!KNOWN_SECTIONS.includes(s.id)) out.push(s);
    else if (!placed) {
      out.push(...variantSections(key));
      placed = true;
    }
  }
  return placed ? out : [...variantSections(key), ...out];
}

/** The task prompt with the block of the model at its end, one time. */
export function withBlock(prompt, key) {
  return prompt.includes(BLOCK_OPEN)
    ? prompt
    : `${prompt}\n\n${spawnBlock(key)}`;
}
