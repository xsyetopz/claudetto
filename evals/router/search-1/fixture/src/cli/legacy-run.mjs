import { parseDuration } from "../legacy/duration.mjs";

export function runLegacy(argv) {
  return parseDuration(argv[0]);
}
