// The shapes that the status line reads.
// Claude Code sends the status object on stdin. The usage cache and the transcript are files
// that Claude Code writes, and the subagent input is the JSON of its subagent status line.
// Each field is optional, because Claude Code can leave any field out.

/** The `model` object of the status input. */
export type Model = { id?: string; display_name?: string };

/** The `workspace` object of the status input. */
export type Workspace = {
  current_dir?: string;
  project_dir?: string;
  added_dirs?: string[];
  git_worktree?: string;
  repo?: { host?: string; owner?: string; name?: string };
};

/** The `cost` object: the spend in dollars, the session time in milliseconds, and the changed lines. */
export type Cost = {
  total_cost_usd?: number;
  total_duration_ms?: number;
  total_lines_added?: number;
  total_lines_removed?: number;
};

/** The `context_window` object: the tokens in the context, and the size of the window. */
export type ContextWindow = {
  total_input_tokens?: number;
  context_window_size?: number;
};

/** One limit window. `used_percentage` is in percent, and `resets_at` is in seconds. */
export type LimitWindow = {
  used_percentage: number;
  resets_at?: number | null;
};

/** The `rate_limits` object: the limit windows of the session. */
export type RateLimits = {
  five_hour?: LimitWindow;
  seven_day?: LimitWindow;
  spend_limit?: LimitWindow;
};

/** The causes of the misses of the prompt cache that the status line counts. */
export type MissCauses = {
  ttl_expired_5m?: number;
  ttl_expired_1h?: number;
  model_changed?: number;
};

/** The `prompt_cache` object: the state, the hit ratio, and the misses of the prompt cache. */
export type PromptCache = {
  warm?: boolean;
  caching_observed?: boolean;
  expires_at?: number;
  misses?: number;
  hit_ratio?: number;
  miss_causes?: MissCauses;
  last_miss_cause?: { causes?: string[] };
  recache_tokens_if_cold?: number;
};

/** The `pr` object: a pull request or a merge request, with its review state. */
export type Pr = {
  number?: number;
  url?: string;
  review_state?: string;
  kind?: string;
};

/** The status object that Claude Code sends on stdin. */
export type StatusInput = {
  cwd?: string;
  session_name?: string;
  model?: Model;
  workspace?: Workspace;
  output_style?: { name?: string };
  cost?: Cost;
  context_window?: ContextWindow;
  fast_mode?: boolean;
  effort?: { level?: string };
  thinking?: { enabled?: boolean };
  rate_limits?: RateLimits;
  vim?: { mode?: string };
  agent?: { name?: string };
  pr?: Pr;
  worktree?: { name?: string };
  prompt_cache?: PromptCache;
  transcript_path?: string;
};

/** One running subagent, as the subagent status line gets it. */
export type Task = {
  id?: string;
  name?: string;
  agentType?: string;
  status?: string;
  description?: string;
  startTime?: number | string;
  model?: string;
  effort?: string;
  contextWindowSize?: number;
  tokenCount?: number;
};

/** The JSON that the subagent status line gets on stdin. */
export type SubagentInput = { columns?: number; tasks?: Task[] };

/** One output row of the subagent status line. */
export type TaskRow = { id?: string; content: string };

/** The exact parts of the context, in tokens, from a `/context` table. */
export type TableParts = { system: number; memory: number; skills: number };

/** One record of the transcript. Only the fields that the table reader uses are typed. */
export type TableRecord = {
  type?: string;
  isSidechain?: boolean;
  message?: { content?: unknown };
};

/**
 * The parts of the context. Without a `/context` table, only `free` is known.
 * With a table, the parts are exact, and `messages` is the rest of the total.
 */
export type ContextParts =
  | {
      free: number;
      exact?: undefined;
      system?: undefined;
      memory?: undefined;
      skills?: undefined;
      messages?: undefined;
    }
  | {
      free: number;
      exact: true;
      system: number;
      memory: number;
      skills: number;
      messages: number;
    };

/** The weekly window of Fable. `resetsAt` is in seconds, or `null` when the row has none. */
export type Fable = { percent: number; resetsAt: number | null };

/** One reset grant of the `cedar_ember` block of the usage cache. The span is in ISO strings. */
export type Grant = {
  resets_left?: number;
  paused?: boolean;
  usable_now?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
};

/** The `cedar_ember` block of the usage cache. */
export type CreditsBlock = { eligible?: boolean; grants?: Grant[] };

/** One row of `utilization.limits` in the usage cache. */
export type FableLimit = {
  kind?: string;
  percent?: number;
  resets_at?: string;
  scope?: { model?: { id?: string | null; display_name?: string } } | null;
};

/** The `cachedUsageUtilization` object of the config file of Claude Code. */
export type UsageCache = {
  fetchedAtMs?: number;
  utilization?: { cedar_ember?: CreditsBlock; limits?: FableLimit[] };
};

/** The reset credits that the user can spend: the count, and the earliest expiry in seconds. */
export type Credits = { left: number; until: number | null };

/** The credits and the Fable window that the usage cache gives. */
export type Usage = { credits: Credits | null; fable: Fable | null };

/** The branch, the changed files, and the commits ahead and behind of the working folder. */
export type GitState = {
  branch: string | null;
  dirty: number;
  ahead: number;
  behind: number;
};

/** The newest OpenSpec change: its id, and its done and total task counts. */
export type Spec = { id: string; done: number; total: number };

/** The pace of a limit window: the delta in percent, and the time at which the limit runs out. */
export type Pace = { delta: number; runOutAt: number | null };

/** The hit percentage, the misses that count, and the cause of the last such miss. */
export type CacheStats = {
  hit: number | null;
  misses: number;
  last: string | null;
};

/** The cost and the changed lines for each hour of the session. */
export type Rates = { costPerHour: number | null; linesPerHour: number };

/** Text that a segment may take. A falsy value is no segment. */
export type Text = string | false | null | undefined;

/** One piece of text in a grid cell, with the priority that decides what goes first. */
export type Item = { priority: number; text: string };

/** A named segment of the main status line. */
export type Segment = Item & { id: string };

/** The context that the main status line gives to the rows of its segments. */
export type RenderCtx = {
  now: number;
  columns: number;
  git: GitState | null;
  spec: Spec | null;
  credits: Credits | null;
  fable: Fable | null;
  table: TableParts | null;
};

/** The context of the grid. `parts` is `null` when the grid shows no breakdown. */
export type GridCtx = {
  now: number;
  spec: Spec | null;
  fable: Fable | null;
  parts?: ContextParts | null;
};
