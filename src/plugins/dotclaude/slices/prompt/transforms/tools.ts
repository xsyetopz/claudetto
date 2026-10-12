import { applyParts, type Part } from "./parts.ts";

export const PARTS: readonly Part[] = [
  {
    anchor: /^ - Prefer dedicated tools over Bash.*$/gm,
    text: " - Prefer the dedicated tools, such as Read, Edit, and Write, over Bash. Use Bash for shell-only operations.",
  },
  {
    anchor: /^ - You can call multiple tools in a single response.*$/gm,
    text: " - Call independent tools in one response, in parallel. Call dependent tools one after another, in order.",
  },
];

export const transform = (text: string): string => applyParts(text, PARTS);
