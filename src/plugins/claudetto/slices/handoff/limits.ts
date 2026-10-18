// The bounds of the `handoff` slice.

/** The most lines of a handoff, as its prompt asks for them (spec `handoff`, "Checked handoff file"). */
export const HANDOFF_LINES_MAX = 10;

/** The most characters of the input of one tool call that the fork prompt names (`handoff-cost-301.md`). */
export const CALL_INPUT_CHARS_MAX = 300;

/** The characters of one token in the estimate of the size of the new context (task 3.3). */
export const CHARS_PER_TOKEN = 4;

/** The prompt cache TTL of a root session: 1 hour. Claudetto asks for it with `CLAUDE_CODE_PROMPT_CACHE_TTL` (`settings.env` of the slice). */
export const CACHE_TTL_MS = 3_600_000;

/** The prompt cache TTL of a subagent: 5 minutes, the default of Claude Code, which `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` can change. */
export const SUBAGENT_CACHE_TTL_MS = 300_000;

/** The most changed files that a cold handoff names. */
export const COLD_FILES_MAX = 20;

/** The most user messages that a cold handoff quotes, from the end of the session. */
export const COLD_PROMPTS_MAX = 3;

/** The most characters of the task and of one quoted user message in a cold handoff. */
export const COLD_PROMPT_CHARS_MAX = 1500;
