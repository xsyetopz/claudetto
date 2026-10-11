// The `agent-browser` guide that the `drive-web-browser` skill loads.

import { MAX_GUIDE_CHARS } from "./limits.mjs";

/** The command that prints the guide. */
export const GUIDE_COMMAND = ["agent-browser", "skills", "get", "core"];

/** The text when `agent-browser` gives no guide. */
export const NOT_INSTALLED =
  "agent-browser is not installed. Ask the user to install it with: npm install -g agent-browser";

/** The text when `agent-browser` runs but gives no guide, for example after a timeout or in an old version. */
export const noGuide = (why) =>
  [
    `\`${GUIDE_COMMAND.join(" ")}\` gave no guide (${why}).`,
    "Run `agent-browser --help` to see the commands of the installed version.",
  ].join("\n");

/**
 * The guide text for the skill from one run of `GUIDE_COMMAND`, a `spawnSync` result.
 * A missing binary gives `NOT_INSTALLED`, a failed run gives `noGuide`, and a guide over `MAX_GUIDE_CHARS` stops with a notice.
 */
export function guideText(run, max = MAX_GUIDE_CHARS) {
  if (run.error?.code === "ENOENT") return NOT_INSTALLED;
  if (run.error) return noGuide(run.error.code ?? run.error.message);
  if (run.status !== 0) return noGuide(`exit code ${run.status}`);
  const text = String(run.stdout ?? "");
  if (!text.trim()) return noGuide("empty output");
  if (text.length <= max) return text;
  return [
    text.slice(0, max),
    "",
    `The guide stops at ${max.toLocaleString("en-US")} characters.`,
    `Run \`${GUIDE_COMMAND.join(" ")}\` to read the rest when the task needs it.`,
  ].join("\n");
}
