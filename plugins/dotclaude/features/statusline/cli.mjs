// `statusLine`: reads the status JSON of Claude Code on stdin and prints up to 3 rows that fit `COLUMNS`.
// Claude Code runs it every `refreshInterval` seconds, which keeps the countdowns and the blinking glyph current.
// It calls no model and no network, and no program except `git`.
// The launcher stub imports this file, so it runs on import.

import { accountOf, WINDOW_SPANS, writeUsage } from "../../lib/usage-state.mjs";
import { readBreakdown } from "./breakdown.mjs";
import { readTable } from "./context-table.mjs";
import { readUsage } from "./credits.mjs";
import { burnRate, pace } from "./derive.mjs";
import { gitState } from "./git.mjs";
import { readInput } from "./input.mjs";
import { COLUMNS_MARGIN, DEFAULT_COLUMNS } from "./limits.mjs";
import { openspecChange } from "./openspec.mjs";
import { render } from "./render.mjs";
import { recordBurn } from "./state.mjs";

/** The burn-rate part of the context: the rate of the 5-hour limit and the reset-used mark. */
function burnOf(data, now) {
  const state = recordBurn(
    accountOf(),
    data.rate_limits?.five_hour,
    now / 1000,
  );
  return state && { rate: burnRate(state.samples), resetUsed: state.resetUsed };
}

/** Write the usage windows of `data` for the context hook, with the run-out time of the pace. */
function saveUsage(data, now) {
  const windows = {};
  for (const [key, span] of Object.entries(WINDOW_SPANS)) {
    const w = data.rate_limits?.[key];
    if (!Number.isFinite(w?.used_percentage)) continue;
    windows[key] = {
      used_percentage: w.used_percentage,
      resets_at: w.resets_at,
      run_out_at: pace(w, now, span)?.runOutAt ?? null,
    };
  }
  if (Object.keys(windows).length) writeUsage(accountOf(), windows, now);
}

try {
  const data = readInput();
  if (!data) console.log("");
  else {
    const now = Date.now();
    saveUsage(data, now / 1000);
    const usage = readUsage(process.env, now);
    const dir = data.workspace?.current_dir || data.cwd || process.cwd();
    console.log(
      render(data, {
        now,
        columns:
          (Number(process.env.COLUMNS) || DEFAULT_COLUMNS) - COLUMNS_MARGIN,
        git: gitState(dir, now),
        spec: openspecChange(data.workspace?.project_dir || dir),
        burn: burnOf(data, now),
        credits: usage.credits,
        fable: usage.fable,
        start: readBreakdown(data),
        table: readTable(data),
      }),
    );
  }
} catch {
  console.log("");
}
