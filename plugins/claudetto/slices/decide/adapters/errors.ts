// The errors and the exit codes of the command `claudetto-decide`.

export const EXIT = {
  ok: 0,
  failed: 1,
  usage: 2,
  invalidKey: 3,
  noBalance: 4,
} as const;

/** A fault of the arguments or of the key. */
export class UsageError extends Error {}

export { ApiError } from "../../../kernel/jev.ts";
