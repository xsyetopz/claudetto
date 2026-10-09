// `subagentStatusLine`: reads the input of Claude Code on stdin and prints one JSON row for each running subagent.
// A failure prints nothing, so the rows keep the default look of Claude Code.
// The launcher stub imports this file, so it runs on import.

import { readInput } from "./input.mjs";
import { taskRows } from "./subagents.mjs";

try {
  for (const row of taskRows(readInput() ?? {}))
    console.log(JSON.stringify(row));
} catch {
  // Rows keep the default rendering.
}
