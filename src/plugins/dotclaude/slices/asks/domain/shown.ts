// The text of a changed line, cut for an ask reason, as a pure function.

import { LINE_SHOWN_MAX_CHARS } from "../limits.ts";

/** `s` trimmed and cut to `LINE_SHOWN_MAX_CHARS`. */
export const shown = (s: string): string => {
  const t = s.trim();
  return t.length > LINE_SHOWN_MAX_CHARS
    ? `${t.slice(0, LINE_SHOWN_MAX_CHARS)}...`
    : t;
};
