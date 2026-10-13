// Where Claude Code usage went, from the session transcripts under
// `~/.claude/projects` (or `$CLAUDE_CONFIG_DIR/projects`).
// The `dotclaude-usage` bin calls `main`.
//
// Costs are API-equivalent dollars at list prices: a subscription does not
// bill them, but its limits track the same token mix, so the shares show
// what spends a plan's limits. Reports the share by agent type, the share of
// calls whose context is past the context window, and the cost of full cache
// rewrites (a write over 30k tokens that is larger than the read), the
// main-conversation turns that background agents started, the advisor's
// share, and the prompt cache hit rate (cache reads over all input tokens).
// For each run (a session, and each subagent run) it reports the model calls
// and the context that each call reads again (cache reads plus input tokens).
// It lists the skills that the transcripts show as available and the period did not call.
// It shows the build (version and short SHA) of each session from its stamp row, and the cost of each build.
// When the transcripts list no skills, it reads the installed plugins and the skills folder, and names that source.
// An advisor call is an `advisor_message` entry in the call's
// `usage.iterations`, and the call's own token counts leave it out.
// With `--agents-dir DIR`, it reads `maxTurns` from `DIR/<agent>.md` and compares the briefs of the runs
// that reached the report reserve with the briefs of the other runs.
// A full rewrite is expected on the first call of a transcript, on the first
// call after a compaction, and after a model switch, because each one starts
// a new cache prefix. The report counts those apart from the rewrites that
// nothing explains.
// It also counts main sessions by Claude Code entrypoint (`cli`, `claude-vscode`,
// `sdk-cli`, `sdk-py`) and the wake turns of each entrypoint, usage-limit hits (the synthetic assistant message
// with `error: "rate_limit"` that Claude Code writes), and `Skill` tool calls by skill.
// The delegation share compares main-conversation turns with subagent runs,
// and sizes the tool results that enter the main context per session.
// The run table lists the latest subagent runs with the cost of each.
// The report states measurements, and it does not state the cause of a limit.

import os from "node:os";
import path from "node:path";
import { report } from "../domain/report.ts";
import { textOf } from "../domain/text.ts";
import { store } from "./store.ts";

const USAGE = `Usage: dotclaude-usage [--days 7] [--root DIR] [--runs 20] [--window N] [--agents-dir DIR] [--json]

Reports where Claude Code usage went, from the session transcripts.
--days N         The period, in days back from now. Default 7.
--root DIR       The transcripts folder. Default: projects under $CLAUDE_CONFIG_DIR or ~/.claude.
--runs N         Rows in the run tables. Default 20.
--window N       The context window in tokens. Default: from the model name, else 200000.
--agents-dir DIR Read maxTurns from DIR/<agent>.md to compare the briefs of runs that hit the turn limit.
--json           Print the report as JSON.`;

/** Runs the bin with `args`, prints to stdout, and returns the exit code. */
export const main = async (
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> => {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(USAGE);
    return 0;
  }
  const opt = (name: string, fallback?: string | null) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : fallback;
  };
  const daysArg = opt("--days", "7") ?? "";
  const days = /^\d+$/.test(daysArg) ? Number(daysArg) : 0;
  if (days < 1) {
    console.error(`--days needs a positive whole number, not "${daysArg}".`);
    return 2;
  }
  const configDir =
    env["CLAUDE_CONFIG_DIR"] || path.join(os.homedir(), ".claude");
  const root = opt("--root", path.join(configDir, "projects")) as string;
  const window = opt("--window") ? Number(opt("--window")) : null;
  const r = await report(
    store,
    root,
    new Date(Date.now() - days * 86_400_000),
    {
      runLimit: Number(opt("--runs", "20")),
      agentsDir: opt("--agents-dir", null),
      window,
      configDir,
    },
  );
  console.log(
    args.includes("--json")
      ? JSON.stringify(r, null, 2)
      : textOf(r, days, window).join("\n"),
  );
  return 0;
};
