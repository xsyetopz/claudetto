import {
  SESSION_GUIDANCE_IF_THE_USER_ASKS,
  SESSION_GUIDANCE_WHEN_THE_USER_TYPES,
} from "../prompts.ts";
import { applyParts, type Part } from "./parts.ts";

export const PARTS: readonly Part[] = [
  {
    anchor: /^ - When the user types `\/<skill-name>`.*$/gm,
    text: SESSION_GUIDANCE_WHEN_THE_USER_TYPES,
  },
  {
    anchor: /^ - If the user asks about "ultrareview".*$/gm,
    text: SESSION_GUIDANCE_IF_THE_USER_ASKS,
  },
];

export const transform = (text: string): string => applyParts(text, PARTS);
