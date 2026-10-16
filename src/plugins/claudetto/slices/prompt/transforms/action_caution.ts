import { ACTION_CAUTION_FOR_ACTIONS_THAT_ARE } from "../prompts.ts";
import { applyParts, type Part } from "./parts.ts";

export const PARTS: readonly Part[] = [
  {
    anchor: /^For actions that are hard to reverse.*$/gm,
    text: ACTION_CAUTION_FOR_ACTIONS_THAT_ARE,
  },
];

export const transform = (text: string): string => applyParts(text, PARTS);
