import { parseDuration } from "#time";

export function run(argv) {
  return parseDuration(argv[0]);
}
