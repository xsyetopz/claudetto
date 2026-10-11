// `subagentStatusLine`: reads the input of Claude Code on stdin and prints one JSON row for each running subagent.
// A failure prints nothing on stdout, so the rows keep the default look of Claude Code, and it writes the error to stderr.

import { failureText } from "../../lib/hook-io.mjs";
import { readInput } from "./input.mjs";
import { taskRows } from "./subagents.mjs";

try {
  for (const row of taskRows(readInput() ?? {}))
    console.log(JSON.stringify(row));
} catch (err) {
  // Rows keep the default rendering, and stderr shows the cause.
  process.stderr.write(failureText(err));
}
