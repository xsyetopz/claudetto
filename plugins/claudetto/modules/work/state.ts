// The `$.state` values that the module `work` owns (D5 of change `redesign-0-4-0`).
// Each file that calls `$.state` keeps its own literal ref, because the mod runtime takes no imported ref.

export type { Note } from "./domain/notes.ts";
export type { Notes } from "./notes/domain/counters.ts";
export type { Known, Saved } from "./protect/domain/protect.ts";

/** `bashSaved` holds the protected files before one `Bash` call, one member for each `tool_use_id` (`protect`). `bashKnown` holds the commits that git had at the first `Bash` call of the session, in the member `session`. `goalBlocks` and `loopBlocks` are counts of the stops that `finish` blocked in a row. */
export const STATE_KEYS = [
  "bashKnown",
  "bashSaved",
  "goalBlocks",
  "loopBlocks",
  "note",
  "notes",
] as const;
