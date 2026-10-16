import {
  TOOLS_PREFER_DEDICATED_TOOLS_OVER,
  TOOLS_YOU_CAN_CALL_MULTIPLE,
} from "../prompts.ts";
import { applyParts, type Part } from "./parts.ts";

export const PARTS: readonly Part[] = [
  {
    anchor: /^ - Prefer dedicated tools over Bash.*$/gm,
    text: TOOLS_PREFER_DEDICATED_TOOLS_OVER,
  },
  {
    anchor: /^ - You can call multiple tools in a single response.*$/gm,
    text: TOOLS_YOU_CAN_CALL_MULTIPLE,
  },
];

export const transform = (text: string): string => applyParts(text, PARTS);
