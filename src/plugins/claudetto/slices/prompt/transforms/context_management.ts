import {
  CONTEXT_MANAGEMENT_HANDOFF,
  CONTEXT_MANAGEMENT_OFF,
} from "../prompts.ts";
import { applyParts, type Part } from "./parts.ts";

// The text of the `context_management` section for each compaction state (spec `prompt-profile`, "Compaction gate").
// The built-in text says that the context is summarized, which is true only for the built-in compaction.
// `domain/compaction.ts` chooses the state, and the `built-in` state keeps the built-in text.

/** A compaction state with a text of its own: the handoff, or no compaction (`DISABLE_COMPACT`). */
export type GatedState = "handoff" | "off";

/** A compaction state: a gated state, or the built-in compaction that keeps the built-in text. */
export type CompactionState = GatedState | "built-in";

const ANCHOR = /^When the conversation grows long.*$/gm;

/** The parts of each state. */
export const PARTS_OF: Readonly<Record<GatedState, readonly Part[]>> = {
  handoff: [
    {
      anchor: ANCHOR,
      text: CONTEXT_MANAGEMENT_HANDOFF,
    },
  ],
  off: [
    {
      anchor: ANCHOR,
      text: CONTEXT_MANAGEMENT_OFF,
    },
  ],
};

/** The parts of each state, in one list. */
export const PARTS: readonly Part[] = Object.values(PARTS_OF).flat();

/** The text of the section for `state`. */
export const transform = (text: string, state: GatedState): string =>
  applyParts(text, PARTS_OF[state]);
