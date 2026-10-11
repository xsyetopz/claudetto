// `subagentStatusLine`: reads the input of Claude Code on stdin and prints one JSON row for each running subagent.
// A failure prints nothing on stdout, so the rows keep the default look of Claude Code, and it writes the error to stderr.

import { failureText } from "../../lib/hook-io.ts";
import { readInput } from "./input.ts";
import { taskRows } from "./subagents.ts";
import type { SubagentInput } from "./types.ts";

try {
  for (const row of taskRows((await readInput<SubagentInput>()) ?? {}))
    console.log(JSON.stringify(row));
} catch (err) {
  // Rows keep the default rendering, and stderr shows the cause.
  process.stderr.write(failureText(err));
}
