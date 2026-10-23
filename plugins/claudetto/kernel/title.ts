// The Chicago Title Case of a title (CMOS 17, 8.159 to 8.161), for the headings of Markdown files and the titles of pull requests and issues.
// The function is pure and imports nothing.
// The first and last word and each major word get a capital.
// An article, a coordinating conjunction, and a preposition stay in lower case, also `to` and `as`, unless the word is first, last, or after a colon.
// A code span in backticks, a word with a digit or an inner capital (`iOS`, `API`), a path, a file name, a flag, and an identifier stay as typed.
// A preposition that can be an adverb (`up`, `out`, `off`, `over`, `down`) gets a capital, because the function cannot read the sentence.

/** The words that stay in lower case in the middle of a title: articles, `and`, `but`, `for`, `or`, `nor`, `to`, `as`, `vs`, and the short prepositions. */
const SMALL = new Set([
  "a",
  "an",
  "the",
  "and",
  "but",
  "for",
  "or",
  "nor",
  "as",
  "to",
  "vs",
  "about",
  "above",
  "across",
  "after",
  "against",
  "along",
  "among",
  "at",
  "before",
  "behind",
  "below",
  "beneath",
  "beside",
  "between",
  "beyond",
  "by",
  "during",
  "except",
  "from",
  "in",
  "into",
  "of",
  "on",
  "onto",
  "per",
  "through",
  "throughout",
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

/** The prefixes whose compound keeps the second element in lower case (8.161): `Anti-intellectual`, `Non-native`. */
const PREFIXES = new Set([
  "anti",
  "co",
  "de",
  "extra",
  "inter",
  "intra",
  "multi",
  "non",
  "post",
  "pre",
  "pro",
  "re",
  "semi",
  "sub",
  "super",
  "ultra",
  "un",
  "under",
]);

/** A word, or a run of words and code spans with no space outside a code span. */
const TOKEN = /(?:`[^`]*`|[^\s`])+/g;

/** The punctuation before and after the core of a token. */
const EDGES = /^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9]*)$/s;

/** A word of letters and hyphens only. */
const COMPOUND = /^[A-Za-z]+(?:-[A-Za-z]+)+$/;

const upperFirst = (word: string): string =>
  word.charAt(0).toUpperCase() + word.slice(1);

/** Whether the text keeps its case: a digit, a capital after the first letter, or a character of a path, a file name, or an identifier. */
const isTyped = (core: string): boolean =>
  /\d/.test(core) || /.[A-Z]/.test(core) || /[/\\._@~=:]/.test(core);

/** One part of a word: `needsCapital` for a part that must have one, else a small word stays in lower case. */
const casePart = (part: string, needsCapital: boolean): string => {
  if (isTyped(part)) return part;
  const lower = part.toLowerCase();
  return !needsCapital && SMALL.has(lower) ? lower : upperFirst(part);
};

/** A hyphenated compound: the first part has a capital, and each later part has one unless it is a small word or follows a prefix (8.161). */
const caseCompound = (core: string): string => {
  const [head = "", ...rest] = core.split("-");
  const prefixed = PREFIXES.has(head.toLowerCase());
  return [
    casePart(head, true),
    ...rest.map((part) =>
      prefixed && !isTyped(part) ? part.toLowerCase() : casePart(part, false),
    ),
  ].join("-");
};

const caseWord = (word: string, needsCapital: boolean): string => {
  if (word.includes("`") || /^[-@#$~./\\<>=]/.test(word)) return word;
  const [, lead = "", core = "", tail = ""] = EDGES.exec(word) ?? [];
  if (COMPOUND.test(core)) return lead + caseCompound(core) + tail;
  return lead + casePart(core, needsCapital) + tail;
};

/** `title` in Chicago Title Case. The spaces between the words stay as they are. */
export const titleCase = (title: string): string => {
  const found = [...title.matchAll(TOKEN)];
  const lettered = found.flatMap((m, i) => (/[A-Za-z]/.test(m[0]) ? [i] : []));
  const first = lettered[0];
  const last = lettered.at(-1);
  let out = "";
  let at = 0;
  for (const [i, m] of found.entries()) {
    const needsCapital =
      i === first || i === last || (found[i - 1]?.[0].endsWith(":") ?? false);
    out += title.slice(at, m.index) + caseWord(m[0], needsCapital);
    at = (m.index ?? 0) + m[0].length;
  }
  return out + title.slice(at);
};
