// The shapes that the status line reads. Claude Code can leave any field out.
import type { Paint } from "./color.ts";
import type { LimitWindow } from "./format.ts";
import type { WindowSources } from "./window.ts";

export interface StatusInput {
	cwd?: string;
	model?: { id?: string; display_name?: string };
	workspace?: { current_dir?: string; project_dir?: string };
	cost?: {
		total_cost_usd?: number;
		total_lines_added?: number;
		total_lines_removed?: number;
	};
	/** `used_percentage` is `null` before the first message, and `current_usage` is `null` before the first call and after `/compact`. */
	context_window?: {
		total_input_tokens?: number;
		context_window_size?: number;
		used_percentage?: number | null;
		current_usage?: {
			input_tokens?: number;
			output_tokens?: number;
			cache_creation_input_tokens?: number;
			cache_read_input_tokens?: number;
		} | null;
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
	rate_limits?: Limits;
}

export interface Limits {
	five_hour?: LimitWindow;
	seven_day?: LimitWindow;
	spend_limit?: LimitWindow;
}

export interface GitState {
	branch: string;
	dirty: number;
	ahead: number;
	behind: number;
}

export interface GitFault {
	error: string;
}

/** The active openspec change. `next` is the id of the first open task. */
export type Change =
	| { name: string; state: "planning" | "error" }
	| { name: string; state: "open"; done: number; total: number; next: string }
	| { name: string; state: "done"; total: number };

/** What a segment reads. `now` is in milliseconds, `compact` means countdown times in place of the clock, and `windows` holds the settings that set the context window, and `compaction` is true for the `built-in` compaction. `ages` holds the age in milliseconds of each limit window from an older reading. */
export interface Status {
	input: StatusInput;
	ages?: Partial<Record<keyof Limits, number>>;
	folder: string;
	git: GitState | GitFault | undefined;
	change: Change | undefined;
	now: number;
	paint: Paint;
	windows: WindowSources;
	compaction: boolean;
	compact: boolean;
}
