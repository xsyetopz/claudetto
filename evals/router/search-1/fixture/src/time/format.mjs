import { parseDuration } from "./parse.mjs";

export function formatDuration(text) {
  return `${parseDuration(text) / 1000}s`;
}
