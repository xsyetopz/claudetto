import { applyParts, type Part } from "./parts.ts";

export const PARTS: readonly Part[] = [
  {
    anchor: /^ - Only use emojis.*$/gm,
    text: " - Use no emojis unless the user asks for them.",
  },
  {
    anchor: /^ - Your responses should be short.*$/gm,
    text: " - Keep responses short and concise.",
  },
  {
    anchor: /^ - When referencing specific functions.*$/gm,
    text: " - When you cite code, use `file_path:line_number`.",
  },
  {
    anchor: /^ - Do not use a colon before tool calls.*$/gm,
    text: " - Do not put a colon before a tool call. End the sentence with a period.",
  },
];

export const transform = (text: string): string => applyParts(text, PARTS);
