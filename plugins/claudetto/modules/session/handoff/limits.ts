// The bounds of the `handoff` slice.
/** The characters of one token in the estimate of the size of a context (task 3.3). */
export const CHARS_PER_TOKEN = 4;
/** The prompt cache TTL of a root session: 1 hour. Claudetto asks for it with `CLAUDE_CODE_PROMPT_CACHE_TTL`. */
export const CACHE_TTL_MS = 3_600_000;
/** The most changed files that a cold handoff names. */
export const COLD_FILES_MAX = 20;
/** The most user messages that a cold handoff quotes, from the end of the session. */
export const COLD_PROMPTS_MAX = 3;
/** The most characters of the task and of one quoted user message in a cold handoff. */
export const COLD_PROMPT_CHARS_MAX = 1500;
/** The context in tokens above which a turn end starts a handover, below the 225k start of the automatic compaction (D12, trigger 1). */
export const HANDOVER_CONTEXT_TOKENS = 150_000;
/** The age of a session in milliseconds above which a turn end starts a handover: 8 hours (D12, trigger 3). */
export const HANDOVER_AGE_MS = 8 * 3_600_000;
/** The cases of D12: the context passes its bound, the cache is cold, the open change moves to its next task group, or the session is old. */
export type Case = "context" | "idle" | "group" | "age";
/** What a case runs: a handover, a compaction, or the handoff file and then a compaction. */
export type Path = "handover" | "compact" | "handoff-then-compact";
/**
 * One row of the path table: the first row of a case whose `tokensMax` holds the context decides.
 * `model` is the first request step after a handover, and `null` is the session model.
 */
export interface PathRow {
  readonly case: Case;
  readonly tokensMax: number;
  readonly path: Path;
  readonly model: string | null;
}
/** The context of the `group` case up to which `/compact` costs less than a handover: between the 50k and 100k runs of task 11.6. */
export const GROUP_COMPACT_TOKENS = 75_000;
/** The path and the model of each case (design D12, spec `handover`), from the paired runs of tasks 11.6 and 11.7. */
export const PATH_TABLE: readonly PathRow[] = [
  {
    case: "group",
    tokensMax: GROUP_COMPACT_TOKENS,
    path: "compact",
    model: null,
  },
  ...(["context", "idle", "group", "age"] as const).map((kind) => ({
    case: kind,
    tokensMax: Number.POSITIVE_INFINITY,
    path: "handover" as const,
    model: "haiku",
  })),
];
/** The most decisions that a handover names, from the end of the session. */
export const DECISIONS_MAX = 10;
/** The most values of the user that a handover names, from the end of the session, and the most characters of one. */
export const USER_VALUES_MAX = 20;
export const USER_VALUE_CHARS_MAX = 200;
