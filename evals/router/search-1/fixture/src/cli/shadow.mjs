import { parseDuration } from "#time";

export const KNOWN = typeof parseDuration;
// The parameter hides the import, so this call is not a call of the import.
export function withParser(parseDuration, text) {
  return parseDuration(text);
}
