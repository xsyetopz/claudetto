// `statusLine`: reads the status JSON of Claude Code on stdin and prints up to 3 rows that fit `COLUMNS`.
// Claude Code runs it every `refreshInterval` seconds, which keeps the countdowns and the blinking glyph current.
// It calls no model and no network, and no program except `git`.
// It writes no file (design D35).

import { readTable } from "./context-table.mjs";
import { readUsage } from "./credits.mjs";
import { gitState } from "./git.mjs";
import { readInput } from "./input.mjs";
import { COLUMNS_MARGIN, DEFAULT_COLUMNS } from "./limits.mjs";
import { openspecChange } from "./openspec.mjs";
import { render } from "./render.mjs";

try {
  const data = readInput();
  if (!data) console.log("");
  else {
    const now = Date.now();
    const usage = readUsage(process.env, now);
    const dir = data.workspace?.current_dir || data.cwd || process.cwd();
    console.log(
      render(data, {
        now,
        columns:
          (Number(process.env.COLUMNS) || DEFAULT_COLUMNS) - COLUMNS_MARGIN,
        git: gitState(dir),
        spec: openspecChange(data.workspace?.project_dir || dir),
        credits: usage.credits,
        fable: usage.fable,
        table: readTable(data),
      }),
    );
  }
} catch {
  console.log("");
}
