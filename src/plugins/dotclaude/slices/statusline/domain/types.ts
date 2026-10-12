// The shapes that the status line reads.
// Claude Code sends the status object on stdin, and the subagent status line gets its own JSON.
// Each field is optional, because Claude Code can leave any field out.

import type { Progress } from "../../../../../kernel/spec-store.ts";
import type { Paint } from "../color.ts";

/** One limit window. `used_percentage` is in percent, and `resets_at` is in seconds. */
export type LimitWindow = {
  used_percentage?: number;
  resets_at?: number | null;
};

/** The status object that Claude Code sends on stdin. */
export type StatusInput = {
  cwd?: string;
  model?: { id?: string; display_name?: string };
  workspace?: { current_dir?: string; project_dir?: string };
  cost?: {
    total_cost_usd?: number;
    total_lines_added?: number;
    total_lines_removed?: number;
  };
  context_window?: {
    total_input_tokens?: number;
    context_window_size?: number;
  };
  effort?: { level?: string };
  thinking?: { enabled?: boolean };
  rate_limits?: {
    five_hour?: LimitWindow;
    seven_day?: LimitWindow;
    spend_limit?: LimitWindow;
  };
};

/** The branch, the changed files, and the commits ahead and behind of the working folder. */
export type GitState = {
  branch: string;
  dirty: number;
  ahead: number;
  behind: number;
};

/** Everything that a segment may read. `now` is in milliseconds, and `paint` has the styles. */
export type Status = {
  input: StatusInput;
  folder: string;
  git: GitState | null;
  change: Progress | null;
  now: number;
  paint: Paint;
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
export type TaskRow = { id: string; content: string };
