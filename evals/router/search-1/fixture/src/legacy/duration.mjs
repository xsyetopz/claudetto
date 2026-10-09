// The duration code of the legacy command. Only ../cli/legacy-run.mjs uses it.
export function parseDuration(text) {
  return Number(text) * 1000;
}
