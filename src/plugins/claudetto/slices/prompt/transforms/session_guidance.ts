import {
  SESSION_GUIDANCE_FOR_BROAD_CODEBASE_EXPLORATION,
  SESSION_GUIDANCE_IF_THE_USER_ASKS,
  SESSION_GUIDANCE_USE_THE_AGENT_TOOL,
  SESSION_GUIDANCE_WHEN_THE_USER_TYPES,
} from "../prompts.ts";
import { applyParts, type Part } from "./parts.ts";

export const PARTS: readonly Part[] = [
  {
    anchor: /^ - Use the Agent tool with specialized agents.*$/gm,
    text: SESSION_GUIDANCE_USE_THE_AGENT_TOOL,
  },
  {
    anchor: /^ - For broad codebase exploration.*$/gm,
    text: SESSION_GUIDANCE_FOR_BROAD_CODEBASE_EXPLORATION,
  },
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
