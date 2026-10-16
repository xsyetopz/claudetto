import type { Part } from "./parts.ts";

// The section is one tag with a count, so the text stays as it is. The transform is the identity.
export const PARTS: readonly Part[] = [];

export const transform = (text: string): string => text;
