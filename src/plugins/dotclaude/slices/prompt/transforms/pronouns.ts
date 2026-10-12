import { applyParts, type Part } from "./parts.ts";

export const PARTS: readonly Part[] = [
  {
    anchor: /^When you use a pronoun.*$/gm,
    text: "When you use a pronoun for a person and their pronouns are not stated, use they/them. Do not infer pronouns from a name, because a wrong guess misgenders a real person. This applies to all user-visible text, including visible thinking.",
  },
];

export const transform = (text: string): string => applyParts(text, PARTS);
