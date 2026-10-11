// The command `dotclaude-browser-guide`: it prints the `agent-browser` guide for the `drive-web-browser` skill.
// It runs `agent-browser skills get core` and cuts the output at the bound of `limits.mjs`.

import { spawnSync } from "node:child_process";
import { GUIDE_COMMAND, guideText } from "./guide.mjs";
import { GUIDE_TIMEOUT_MS } from "./limits.mjs";

/** Prints the guide. Returns the exit code, which is 0 also when `agent-browser` gives no guide, because the text then tells Claude what to do. */
export function main() {
  const [cmd, ...args] = GUIDE_COMMAND;
  const run = spawnSync(cmd, args, {
    encoding: "utf8",
    timeout: GUIDE_TIMEOUT_MS,
    stdio: ["ignore", "pipe", "ignore"],
  });
  console.log(guideText(run));
  return 0;
}
