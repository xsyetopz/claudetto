// The `$.state` values that the module `gate` owns (D5 of change `redesign-0-4-0`).
// Each file that calls `$.state` keeps its own literal ref, because the mod runtime takes no imported ref.

export type { Watches } from "./domain/monitors.ts";
export type { Hashed } from "./secrets/domain/hashes.ts";

export const STATE_KEYS = ["envHashes", "watches"] as const;
