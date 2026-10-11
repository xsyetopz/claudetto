// The model-specific prompt text of design D15, one variant for each model.
// The rules that every model shares are in `shared.ts`, so no rule text is in both places.
// `prompt.compose` returns the shared sections and a variant at session start, and `agent.spawn` adds a short block to a task prompt.
// Each section reads the same for every user of a model, so it sits before the cache boundary.
// The texts come from `src/plugins/dotclaude/features/prompt/texts.ts/` through `just generate`.

import { BLOCK_LINE, EVIDENCE_LINE, SHARED_SECTIONS } from "./shared.ts";
import { FABLE_NOTES, OPUS_NOTES, STEP_LINE, VERIFY_LINE } from "./texts.ts";

const notes = (text: string) => `<model_notes>\n${text}\n</model_notes>`;

/** The key of the variant of each model. */
export type VariantKey = "opus" | "sonnet" | "haiku" | "fable";

/**
 * The variant of each model: the model name, the section with its model lines, and the block for a subagent.
 * The shared `verification` section holds the verification rule for the main session, so no variant repeats it (cut V2 of task 29.3).
 * The block of Sonnet 5.5 and Haiku 5.5 keeps the verification line, because a subagent does not get the shared sections.
 * Fable 5.1 follows its own guide, and its fit is open until the variant evals.
 */
export const VARIANTS: Record<
  VariantKey,
  { name: string; sections: string[]; block: string }
> = {
  opus: {
    name: "Opus 5.5",
    sections: [notes(OPUS_NOTES)],
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
    sections: [notes(FABLE_NOTES)],
    block: `${BLOCK_LINE}\n${EVIDENCE_LINE}`,
  },
};

/**
 * The shared sections and the sections of a variant, as `prompt.compose` takes them: `dotclaude:<tag>` ids, all shared.
 */
export function variantSections(
  key: VariantKey,
): { id: string; text: string; scope: "shared" }[] {
  return [...SHARED_SECTIONS, ...VARIANTS[key].sections].map((text) => ({
    id: `dotclaude:${/^<(\w+)>/.exec(text)?.[1]}`,
    text,
    scope: "shared" as const,
  }));
}

/** The first line of the block that `agent.spawn` adds. A task prompt that has it gets no second block. */
export const BLOCK_OPEN = "<dotclaude_model_notes>";

/**
 * The block that ends the task prompt of a subagent on a model.
 */
export const spawnBlock = (key: VariantKey): string =>
  `${BLOCK_OPEN}\n${VARIANTS[key].block}\n</dotclaude_model_notes>`;
