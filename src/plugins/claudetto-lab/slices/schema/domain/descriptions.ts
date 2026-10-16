// The descriptions of the top-level keys that the bundle gives none.
// In the bundle, these keys are objects whose inner keys carry the descriptions,
// so each text sums up the inner keys.
// `buildSchemas` uses a text here only when the bundle has no description for the key.

import { FALLBACK_DESCRIPTIONS } from "../prompts.ts";

const FALLBACK: Record<string, string> = FALLBACK_DESCRIPTIONS;

// The fallback text of `key`, or undefined. An inherited name such as `constructor` gives undefined.
export const fallbackOf = (key: string): string | undefined =>
  Object.hasOwn(FALLBACK, key) ? FALLBACK[key] : undefined;
