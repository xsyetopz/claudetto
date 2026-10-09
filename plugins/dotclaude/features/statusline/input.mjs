// What the status line reads from its input: the status JSON of Claude Code on stdin.
//
// Sources of the field names, all in `external/cc-2.1.294/strings.txt` (Claude Code 2.1.294),
// as byte offsets (`rg -b`):
// - Main input, built by `SCo` at 22638603 and `TCo` (the `prompt_cache` object) at 22644605:
//   `session_name`, `model.{id,display_name}`, `workspace.{current_dir,project_dir,added_dirs,git_worktree,repo}`,
//   `output_style.name`, `cost.{total_cost_usd,total_duration_ms,total_lines_added,total_lines_removed}`,
//   `context_window.{total_input_tokens,context_window_size}`, `fast_mode`, `effort.level`, `thinking.enabled`,
//   `rate_limits.{five_hour,seven_day,spend_limit}` with `used_percentage` and `resets_at` (seconds),
//   `vim.mode`, `agent.name`, `pr.{number,url,review_state,kind}`,
//   `worktree.{name,path,branch,original_cwd,original_branch}`,
//   `prompt_cache.{warm,caching_observed,expires_at,misses,hit_ratio,last_miss_cause,miss_causes,recache_tokens_if_cold}`.
//   `workspace.repo` is `{host, owner, name}` (the remote parser at 15003195).
// - Subagent input, built at 43916661: `columns` and `tasks[]` with
//   `id,name,type,agentType,status,description,startTime,model,effort,contextWindowSize,tokenCount`.
// - Usage cache: the schema at 20905739 lists no `cedar_ember`, but it passes unknown keys through.
//   The grant fields (`resets_left`, `paused`, `usable_now`, `starts_at`, `ends_at`) are at 41896485 and before.
//   A cache file of 2.1.294 on the dev machine has a `cedar_ember` key.

import fs from "node:fs";

/** The status object for `text`, `{}` for JSON that is not an object, and `null` for text that is not JSON. */
export function parseInput(text) {
  try {
    const data = JSON.parse(text);
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch {
    return null;
  }
}

/** The status object on stdin, or `null`. */
export const readInput = () => {
  try {
    return parseInput(fs.readFileSync(0, "utf8"));
  } catch {
    return null;
  }
};
