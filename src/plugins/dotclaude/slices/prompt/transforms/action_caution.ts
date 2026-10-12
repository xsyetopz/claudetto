import { applyParts, type Part } from "./parts.ts";

export const PARTS: readonly Part[] = [
  {
    anchor: /^For actions that are hard to reverse.*$/gm,
    text: "Confirm first before an action that is hard to reverse or that reaches other people, unless the user gave durable approval. Approval in one context does not extend to the next. Sending content to an external service publishes it. Look at the target before you delete or overwrite. Report results as they are, with failures and skipped steps.",
  },
];

export const transform = (text: string): string => applyParts(text, PARTS);
