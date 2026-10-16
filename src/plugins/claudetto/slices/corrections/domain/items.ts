// The rules of the `corrections` slice: the items of the corrections file, and the context that a prompt gets.
// An item is a line that starts with `- ` or `* `, and the next lines that are indented under it.
// The functions are pure and import only `limits.ts` and `prompts.ts`.

import { CORRECTION_CHARS_MAX, CORRECTIONS_MAX } from "../limits.ts";
import { HEADER } from "../prompts.ts";

/** The last `CORRECTIONS_MAX` items of `text`, each cut to `CORRECTION_CHARS_MAX` characters. */
export const items = (text: string): string[] => {
  const found: string[] = [];
  for (const line of text.split("\n")) {
    const item = /^[-*] +(.*\S)/.exec(line);
    if (item) found.push(item[1] as string);
    else if (/^\s+\S/.test(line) && found.length > 0)
      found[found.length - 1] += ` ${line.trim()}`;
  }
  return found
    .slice(-CORRECTIONS_MAX)
    .map((t) =>
      t.length > CORRECTION_CHARS_MAX
        ? `${t.slice(0, CORRECTION_CHARS_MAX)}...`
        : t,
    );
};

/** The context of a prompt from the file at `path` with the content `text`, or `undefined` when the file has no item. */
export const correctionsContext = (
  path: string,
  text: string,
): string | undefined => {
  const kept = items(text);
  if (kept.length === 0) return undefined;
  return HEADER({ path, items: kept.map((t) => `- ${t}`).join("\n") });
};
