// What the status line reads from its input: the status JSON of Claude Code on stdin.
//
// Sources of the field names, all in `external/cc-2.1.296/strings.txt` (Claude Code 2.1.296),
// as byte offsets (`rg -b`):
// - Main input, built by `QPo` at 22993209 and `tMo` (the `prompt_cache` object) at 22999211:
//   `session_name`, `model.{id,display_name}`, `workspace.{current_dir,project_dir,added_dirs,git_worktree,repo}`,
//   `output_style.name`, `cost.{total_cost_usd,total_duration_ms,total_api_duration_ms,total_lines_added,total_lines_removed}`,
//   `context_window.{total_input_tokens,context_window_size}`, `fast_mode`, `effort.level`, `thinking.enabled`,
//   `rate_limits.{five_hour,seven_day,spend_limit}` with `used_percentage` and `resets_at` (seconds),
//   `vim.mode`, `agent.name`, `pr.{number,url,review_state,kind}`,
//   `worktree.{name,path,branch,original_cwd,original_branch}`,
//   `prompt_cache.{warm,caching_observed,ttl,expires_at,requests,misses,expected_rebuilds,hit_ratio,cache_write_tokens,
//   miss_recache_tokens,last_miss_at,last_miss_cause,miss_causes,recache_tokens_if_cold}`.
//   `workspace.repo` is `{host, owner, name}` (the remote parser `hT` at 15188344).
// - Subagent input, built by `hVe` at 43466008: `columns` and `tasks[]` with
//   `id,name,type,agentType,status,description,label,startTime,model,effort,contextWindowSize,tokenCount,tokenSamples,cwd`.
// - Usage cache: the schema `fS` at 17097204 lists no `cedar_ember`, but it passes unknown keys through (`.passthrough()`).
//   The grant fields (`resets_left`, `paused`, `usable_now`, `starts_at`, `ends_at`) are in the grant schema at 41126777.
//   A cache file on the dev machine has a `cedar_ember` key.

import { rethrowUnless } from "../../lib/errors.ts";
import type { StatusInput } from "./types.ts";

/** The status object for `text`, `{}` for JSON that is not an object, and `null` for text that is not JSON. */
export function parseInput<T extends object = StatusInput>(
  text: string,
): T | null {
  try {
    const data: unknown = JSON.parse(text);
    return data && typeof data === "object" && !Array.isArray(data)
      ? (data as T)
      : ({} as T);
  } catch (err) {
    rethrowUnless(err, "SyntaxError");
    return null;
  }
}

/** The status object on stdin, or `null`. */
export const readInput = async <
  T extends object = StatusInput,
>(): Promise<T | null> => {
  try {
    return parseInput<T>(await Bun.stdin.text());
  } catch (err) {
    // A terminal or a closed pipe on stdin has no status object.
    rethrowUnless(err, "EAGAIN", "EOF");
    return null;
  }
};
