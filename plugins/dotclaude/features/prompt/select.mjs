// The choice of a variant for a model id, and the splice of a variant into the section list of `prompt.compose`.
// Both are pure functions, so the hooks module and the tests share them.

/** @import { PromptComposeSection } from "claude-code" */
/** @typedef {Parameters<typeof spawnBlock>[0]} VariantKey */

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

/**
 * The variant key of a model id or alias (`claude-haiku-5-5`, `haiku`), or null for a model with no variant.
 * Mythos 5.1 gets the Fable variant, because one prompting guide covers both models.
 *
 * @param {unknown} model
 * @returns {VariantKey | null}
 */
export function variantKey(model) {
  const id = String(model ?? "").toLowerCase();
  /** @type {VariantKey[]} */
  const keys = ["opus", "sonnet", "haiku", "fable"];
  if (id.includes("mythos")) return "fable";
  return keys.find((k) => id.includes(k)) ?? null;
}

/**
 * The section list with the known sections replaced by the variant sections.
 * The variant sits where the first known section was, and the unknown sections keep their order.
 *
 * @param {readonly PromptComposeSection[]} sections
 * @param {VariantKey} key
 */
export function composeSections(sections, key) {
  /** @type {PromptComposeSection[]} */
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

/**
 * The task prompt with the block of the model at its end, one time.
 *
 * @param {string} prompt
 * @param {VariantKey} key
 */
export function withBlock(prompt, key) {
  return prompt.includes(BLOCK_OPEN)
    ? prompt
    : `${prompt}\n\n${spawnBlock(key)}`;
}
