// The `$.state` values that the module `session` owns (D5 of change `redesign-0-4-0`).
// Each file that calls `$.state` keeps its own literal ref, because the mod runtime takes no imported ref.

export type { Usage } from "./domain/usage.ts";
export type { Calls } from "./prompt/domain/turns.ts";

export const STATE_KEYS = ["usage", "calls", "resume"] as const;
