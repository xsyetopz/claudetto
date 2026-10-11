// `statusLine`: reads the status JSON of Claude Code on stdin and prints up to 3 rows that fit `COLUMNS`.
// Claude Code runs it every `refreshInterval` seconds, which keeps the countdowns and the blinking glyph current.
// It calls no model and no network, and no program except `git`.
// It writes no file (design D35).

import { failureText } from "../../lib/hook-io.ts";
import { readTable } from "./context-table.ts";
import { readUsage } from "./credits.ts";
import { gitState } from "./git.ts";
import { readInput } from "./input.ts";
import { COLUMNS_MARGIN, DEFAULT_COLUMNS } from "./limits.ts";
import { openspecChange } from "./openspec.ts";
import { render } from "./render.ts";

try {
  const data = await readInput();
  if (!data) console.log("");
  else {
    const now = Date.now();
    const usage = await readUsage(process.env, now);
    const dir = data.workspace?.current_dir || data.cwd || process.cwd();
    console.log(
      render(data, {
        now,
        columns:
          (Number(process.env["COLUMNS"]) || DEFAULT_COLUMNS) - COLUMNS_MARGIN,
        git: gitState(dir),
        spec: await openspecChange(data.workspace?.project_dir || dir),
        credits: usage.credits,
        fable: usage.fable,
        table: await readTable(data),
      }),
    );
  }
} catch (err) {
  // The row stays empty, and stderr shows the cause.
  process.stderr.write(failureText(err));
  console.log("");
}
