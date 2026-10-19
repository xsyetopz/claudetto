# Claude Code Status Line Fields

These are the JSON fields that Claude Code sends to the `statusLine` command on `stdin`.
Use them to show the model, the cost, the context use, and more.
For example, `context_window.used_percentage` is the share of the context window in use.
Fields marked "may be absent" are not in the JSON when they have no value.

The 42 `statusline_keys` of the bundle inventory are all covered:
`added_dirs`, `agent`, `branch`, `context_window`, `cost`, `current_dir`, `display_name`, `effort`, `enabled`, `exceeds_200k_tokens`, `fast_mode`, `git_worktree`, `id`, `kind`, `level`, `mode`, `model`, `name`, `number`, `original_branch`, `original_cwd`, `output_style`, `path`, `pr`, `project_dir`, `rate_limits`, `remote`, `repo`, `review_state`, `session_id`, `session_name`, `thinking`, `total_api_duration_ms`, `total_cost_usd`, `total_duration_ms`, `total_lines_added`, `total_lines_removed`, `url`, `version`, `vim`, `workspace`, `worktree`.

## Session and Model Fields

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `session_id` | Session id | String | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `session_name` | Custom name or AI title | May be absent. The default display name does not fill it | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `prompt_id` | UUID of the prompt in work | May be absent before the first input | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `transcript_path` | Transcript file path | String | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `cwd` | Working directory | Same value as `workspace.current_dir` | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `version` | Claude Code version | `2.1.303` here | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline), bundle |
| ✅ | `model.id`, `model.display_name` | Model id and name | Strings | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `output_style.name` | Active style name | `default` when none. See [Output Styles](Claude-Code-Output-Styles) | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `fast_mode` | Fast mode on | Boolean | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `effort.level` | `low`, `medium`, `high`, `xhigh`, `max` | May be absent when the model has no effort | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `thinking.enabled` | Extended thinking on | Boolean | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `vim.mode` | `NORMAL`, `INSERT`, `VISUAL`, `VISUAL LINE` | May be absent. Present when vim mode is on | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `agent.name` | Agent name | Present with `--agent` or agent settings | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| 🔍 | `remote.session_id` | Id of a remote session | Present when the session is remote. The docs do not list `remote` | Status line | bundle |

## Workspace Fields

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `workspace.current_dir` | Current directory | Preferred over `cwd` | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `workspace.project_dir` | Launch directory | The bundle fills it from the original cwd | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline), bundle |
| ✅ | `workspace.added_dirs` | Directories from `/add-dir` or `--add-dir` | Empty array if none | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `workspace.git_worktree` | Linked worktree name | Absent in the main tree | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `workspace.repo.host`, `.owner`, `.name` | Repository identity from `origin` | May be absent. GitLab subgroups give a slash path in `owner` | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `worktree.name`, `.path`, `.branch`, `.original_cwd`, `.original_branch` | Worktree session data | Only in a worktree session. `branch` and `original_branch` may be absent for hook-based worktrees | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline), bundle |
| ✅ | `pr.number`, `pr.url` | Open PR or GitLab merge request | Removed once it merges or closes | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `pr.review_state` | `approved`, `pending`, `changes_requested`, `draft` | May be absent alone | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `pr.kind` | `mr` for a GitLab merge request | Absent for GitHub | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |

## Cost, Context, and Limit Fields

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `cost.total_cost_usd` | Estimated cost | Client-side list price. Resets at `/clear` | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `cost.total_duration_ms`, `cost.total_api_duration_ms` | Wall time and API wait time | Milliseconds | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `cost.total_lines_added`, `cost.total_lines_removed` | Lines changed | Numbers | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `context_window.total_input_tokens`, `.total_output_tokens` | Tokens in the window | From the last response. `0` before it | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `context_window.context_window_size` | Window size | `200000` or `1000000` | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `context_window.used_percentage`, `.remaining_percentage` | Percent used and left | Input tokens only. May be `null` early | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `context_window.current_usage` | Per-category tokens | Keys `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`. `null` before the first call and after `/compact` | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `exceeds_200k_tokens` | Last response is over 200k tokens | Fixed threshold | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `rate_limits.five_hour`, `.seven_day` | `used_percentage` and `resets_at` | Claude.ai Pro and Max only. A window drops after its reset time | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `rate_limits.spend_limit.used_percentage`, `.resets_at` | Gateway spend limit | Needs `2.1.251` | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `rate_limits.spend_limit.used_usd`, `.limit_usd`, `.period` | Spend in dollars and period `daily`, `weekly`, `monthly` | Needs `2.1.284`. Off with `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |

## Prompt Cache Fields

The object `prompt_cache` appears after the first main-conversation response (needs `2.1.251`).
Subagent requests are not counted.

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `prompt_cache.warm` | Cache is within its TTL | Boolean | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `prompt_cache.caching_observed` | Any response reported cache tokens | `false` means caching is off or not reported | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `prompt_cache.ttl` | Cache lifetime | `"5m"` or `"1h"` | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `prompt_cache.expires_at` | When the cache goes cold | Epoch seconds. `null` if no cache tokens | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `prompt_cache.requests`, `.misses`, `.expected_rebuilds` | Request and miss counts | A miss is over 5% and at least 2,000 tokens re-processed | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `prompt_cache.hit_ratio` | Cache reads over all input tokens | 0 to 1. `null` when counts are zero | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `prompt_cache.cache_write_tokens`, `.miss_recache_tokens` | Tokens written | Totals for the session and for misses | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `prompt_cache.last_miss_at` | Time of the last miss | Epoch seconds. `null` if none | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `prompt_cache.last_miss_cause` | Likely cause | `causes` array (such as `tools_changed`, `system_prompt_changed`, `ttl_expired_5m`, `likely_server_side`), plus `tools_added`, `tools_removed`, `system_char_delta`. Needs `2.1.260` | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `prompt_cache.miss_causes` | Count per cause | Map | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `prompt_cache.recache_tokens_if_cold` | Tokens a cold cache re-caches | `null` after a compaction until the next request | Status line | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |

## Subagent Task Fields

The `subagentStatusLine` command gets the base hook fields, `columns`, and a `tasks` array.

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `columns` | Usable row width | Number | `subagentStatusLine` | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `tasks[].id` | Task id | Echo it back as `id` | `subagentStatusLine` | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `tasks[].name` | Address name | Optional | `subagentStatusLine` | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `tasks[].type` | Kind of task | `local_agent` | `subagentStatusLine` | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `tasks[].agentType` | Subagent type | Same value as hook `agent_type`. Needs `2.1.293` | `subagentStatusLine` | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `tasks[].status` | State | `running`, `completed`, `failed`, `killed` | `subagentStatusLine` | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `tasks[].description`, `tasks[].label` | Short text | `label` is a progress summary, else `description` | `subagentStatusLine` | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `tasks[].startTime` | Start time | Epoch milliseconds | `subagentStatusLine` | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `tasks[].model`, `tasks[].contextWindowSize` | Resolved model and its window | Optional | `subagentStatusLine` | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `tasks[].effort` | Configured effort | String or number. Needs `2.1.213` | `subagentStatusLine` | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `tasks[].tokenCount`, `tasks[].tokenSamples` | Running tokens and up to 16 samples | Oldest first | `subagentStatusLine` | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `tasks[].cwd` | Subagent working directory | Own worktree if any | `subagentStatusLine` | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |

## Not Yet Checked

- Not verified: the exact source of `transcript_path` and `prompt_id` in the bundle (spread from a shared helper).

## See Also

- [Customize Your Status Line](https://code.claude.com/docs/en/statusline)
- [Status Line](Claude-Code-Status-Line)
- [Output Styles](Claude-Code-Output-Styles)
