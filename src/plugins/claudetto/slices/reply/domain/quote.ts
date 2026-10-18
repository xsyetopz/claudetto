// The quote of a message, in the style of a quote block: each line starts with `> `.

import { QUOTE_MAX_LINES } from "../limits.ts";

/** The first `QUOTE_MAX_LINES` lines of `text` as a `>` quote, with a blank line after it for the answer. */
export const quoteOf = (text: string): string =>
  `${text
    .trim()
    .split("\n")
    .slice(0, QUOTE_MAX_LINES)
    .map((line) => `> ${line}`.trimEnd())
    .join("\n")}\n\n`;
