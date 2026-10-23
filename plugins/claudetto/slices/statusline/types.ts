// The shapes that the status line reads. Claude Code can leave any field out.
import type { Paint } from "./color.ts";
import type { LimitWindow } from "./format.ts";

export type StatusInput = {
  cwd?: string;
  model?: { id?: string; display_name?: string };
  workspace?: { current_dir?: string; project_dir?: string };
  cost?: {
    total_cost_usd?: number;
    total_lines_added?: number;
    total_lines_removed?: number;
  };
  /** `used_percentage` is `null` before the first message. */
  context_window?: {
    total_input_tokens?: number;
    context_window_size?: number;
    used_percentage?: number | null;
  };
  /** `ttl` is `5m` or `1h`, and `hit_ratio` is from 0 to 1 (`null` while no input tokens are counted). */
  prompt_cache?: {
    warm?: boolean;
    caching_observed?: boolean;
    ttl?: string;
    hit_ratio?: number | null;
    expires_at?: number | null;
    recache_tokens_if_cold?: number | null;
  };
  /** `kind` is `mr` for a GitLab merge request. */
  pr?: { number?: number; review_state?: string; kind?: string };
  effort?: { level?: string };
  fast_mode?: boolean;
  thinking?: { enabled?: boolean };
  rate_limits?: {
    five_hour?: LimitWindow;
    seven_day?: LimitWindow;
    spend_limit?: LimitWindow;
  };
};

export type GitState = {
  branch: string;
  dirty: number;
  ahead: number;
  behind: number;
};

export type GitFault = { error: string };

/** The active openspec change. `next` is the id of the first open task. */
export type Change =
  | { name: string; state: "planning" | "error" }
  | { name: string; state: "open"; done: number; total: number; next: string }
  | { name: string; state: "done"; total: number };

/** What a segment reads. `now` is in milliseconds, `compact` means countdown times in place of the clock, and `compaction` is true for the `built-in` compaction. */
export type Status = {
  input: StatusInput;
  folder: string;
  git: GitState | GitFault | null;
  change: Change | null;
  now: number;
  paint: Paint;
  compaction: boolean;
  compact: boolean;
};

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

export type SubagentInput = { columns?: number; tasks?: Task[] };
