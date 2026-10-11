// The model-specific prompt text of design D15, one variant for each model.
// The rules that every model shares are in `shared.mjs`, so no rule text is in both places.
// `prompt.compose` returns the shared sections and a variant at session start, and `agent.spawn` adds a short block to a task prompt.
// Each section reads the same for every user of a model, so it sits before the cache boundary.

import { BLOCK_LINE, EVIDENCE_LINE, SHARED_SECTIONS } from "./shared.mjs";

const VERIFY_LINE =
  "Before you say that work is done, run a check of it, such as the tests, the type-check, the build, or the changed command, because a claim with no run is a guess.\nWhen you cannot run one, name the check and say why.";

const STEP_LINE =
  "Finish each step before you start the next one, because an open step can hide a failure.";

/** @param {string} text */
const notes = (text) => `<model_notes>\n${text}\n</model_notes>`;

/**
 * The variant of each model: the model name, the section with its model lines, and the block for a subagent.
 * The shared `verification` section holds the verification rule for the main session, so no variant repeats it (cut V2 of task 29.3).
 * The block of Sonnet 5.5 and Haiku 5.5 keeps the verification line, because a subagent does not get the shared sections.
 * Fable 5.1 follows its own guide, and its fit is open until the variant evals.
 *
 * @typedef {"opus" | "sonnet" | "haiku" | "fable"} VariantKey
 * @type {Record<VariantKey, { name: string, sections: string[], block: string }>}
 */
export const VARIANTS = {
  opus: {
    name: "Opus 5.5",
    sections: [
      notes(
        "Before the first tool call, say in one sentence what you will do, because the user sees the start of the work.\nWhile you work, update the user only when you find something new or change direction.",
      ),
    ],
    block: `${BLOCK_LINE}\n${EVIDENCE_LINE}`,
  },
  sonnet: {
    name: "Sonnet 5.5",
    sections: [],
    block: `${VERIFY_LINE}\n${BLOCK_LINE}\n${EVIDENCE_LINE}`,
  },
  haiku: {
    name: "Haiku 5.5",
    sections: [notes(STEP_LINE)],
    block: `${VERIFY_LINE}\n${STEP_LINE}\n${BLOCK_LINE}\n${EVIDENCE_LINE}`,
  },
  fable: {
    name: "Fable 5.1",
    sections: [
      notes(
        "Edit a file at the lines that need the change, because a rewrite of the whole file hides the real diff.",
      ),
    ],
    block: `${BLOCK_LINE}\n${EVIDENCE_LINE}`,
  },
};

/**
 * The shared sections and the sections of a variant, as `prompt.compose` takes them: `dotclaude:<tag>` ids, all shared.
 *
 * @param {VariantKey} key
 * @returns {{ id: string, text: string, scope: "shared" }[]}
 */
export function variantSections(key) {
  return [...SHARED_SECTIONS, ...VARIANTS[key].sections].map((text) => ({
    id: `dotclaude:${/^<(\w+)>/.exec(text)?.[1]}`,
    text,
    scope: "shared",
  }));
}

/** The first line of the block that `agent.spawn` adds. A task prompt that has it gets no second block. */
export const BLOCK_OPEN = "<dotclaude_model_notes>";

/**
 * The block that ends the task prompt of a subagent on a model.
 *
 * @param {VariantKey} key
 */
export const spawnBlock = (key) =>
  `${BLOCK_OPEN}\n${VARIANTS[key].block}\n</dotclaude_model_notes>`;
