// The Title Case of a Markdown heading (design D52, Chicago style).
// Articles, coordinating conjunctions, and prepositions of any length stay in lower case, except as the first or the last word.
// Inline code, link targets, and a word with a mixed case, a digit, or a dot do not change.
// It is pure string code with no import, because the hooks module loads it and the markdownlint rule of this repository shares it.

/** The minor words: the articles, the coordinating conjunctions, and the prepositions. */
export const MINOR_WORDS: ReadonlySet<string> = new Set([
  "a",
  "an",
  "the",
  "and",
  "but",
  "or",
  "nor",
  "for",
  "so",
  "yet",
  "about",
  "above",
  "across",
  "after",
  "against",
  "along",
  "among",
  "around",
  "as",
  "at",
  "before",
  "behind",
  "below",
  "beneath",
  "beside",
  "between",
  "beyond",
  "by",
  "despite",
  "down",
  "during",
  "except",
  "from",
  "in",
  "inside",
  "into",
  "like",
  "near",
  "of",
  "on",
  "onto",
  "over",
  "per",
  "since",
  "through",
  "throughout",
  "to",
  "toward",
  "towards",
  "under",
  "until",
  "upon",
  "via",
  "with",
  "within",
  "without",
]);

const HEADING = /^(\s{0,3}(?:>\s*)*#{1,6}[ \t]+)(.*?)([ \t]+#+[ \t]*)?$/;
// A part of a heading that the Title Case never changes: a code span, a link target, a tag, and a URL.
const KEPT =
  /(`+)[\s\S]*?(?<!`)\1(?!`)|\]\([^)]*\)|\]\[[^\]]*\]|<[^<>\s][^<>]*>|\b[a-z][a-z0-9+.-]*:\/\/\S+/gi;
const MARK = "\u0000";
const WORD = /^([^A-Za-z0-9]*)([A-Za-z][A-Za-z'’-]*)(.*)$/;
const PLAIN = /^(?:[a-z][a-z'’]*|[A-Z][a-z'’]*)$/;

const upper = (part: string) => part.charAt(0).toUpperCase() + part.slice(1);

/** One whitespace-free word of a heading, in Title Case. `edge` is true for the first word, the last word, and the word after a colon. */
const word = (token: string, edge: boolean): string => {
  const [, head = "", core = "", tail = ""] = token.match(WORD) ?? [];
  if (core === "" || /[A-Za-z0-9]/.test(tail) || /\d/.test(head)) return token;
  const parts = core.split("-");
  if (!parts.every((p) => PLAIN.test(p))) return token;
  const lower = core.toLowerCase();
  if (parts.length === 1 && core !== "A" && MINOR_WORDS.has(lower) && !edge)
    return head + lower + tail;
  return head + parts.map(upper).join("-") + tail;
};

/** The text of a heading in Title Case. */
export const titleCase = (text: string): string => {
  const kept: string[] = [];
  const masked = text.replace(KEPT, (m) => {
    kept.push(m);
    return `${MARK}${kept.length - 1}${MARK}`;
  });
  const tokens = masked.split(/(\s+)/);
  const last = tokens.findLastIndex((t) => t.trim() !== "");
  let edge = true;
  const out = tokens.map((t, i) => {
    if (t.trim() === "") return t;
    const fixed = word(t, edge || i === last);
    edge = /[:.]$/.test(t);
    return fixed;
  });
  return out
    .join("")
    .replace(new RegExp(`${MARK}(\\d+)${MARK}`, "g"), (_, n) => kept[+n] ?? "");
};

/** A line with the Title Case in the text of its ATX heading, or the line itself when it is no heading. */
export const titleLine = (line: string): string => {
  const found = line.match(HEADING);
  if (!found) return line;
  const [, open = "", text = "", close = ""] = found;
  return open + titleCase(text) + close;
};
