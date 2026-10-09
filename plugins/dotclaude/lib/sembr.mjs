// The `sembr` formatter: it puts each sentence of a Markdown paragraph on its own line (design D29).
// It only splits after a sentence end and never joins lines, so a second run gives the same text.
// It is pure string code with no import, because the hooks module may load it.

const ABBREVIATIONS = new Set([
  "e.g",
  "i.e",
  "etc",
  "vs",
  "cf",
  "approx",
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
  "fig",
  "no",
  "inc",
  "al",
]);

const FENCE = /^\s*(?:>\s*)*(`{3,}|~{3,})/;
const FENCE_END = /^\s*(?:>\s*)*[`~]+\s*$/;
const TABLE_RULE =
  /^\s*(?:>\s*)*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?\s*$/;
// A block that opens on a line and closes on a later line: `<pre>`, `<code>`, and a `$$` math block.
const BLOCKS = [
  { open: /^\s*(?:>\s*)*<pre\b[^>]*>?/i, close: /<\/pre\s*>/i },
  { open: /^\s*(?:>\s*)*<code\b[^>]*>?/i, close: /<\/code\s*>/i },
  { open: /^\s*(?:>\s*)*\$\$/, close: /\$\$/ },
];
const LIST = /^(\s*(?:>\s*)*)((?:[-*+]|\d{1,9}[.)])\s+)/;
const SKIP_LINE = /^\s*(?:#{1,6}(?:\s|$)|\[[^\]]+\]:\s|<|\||(?:[-*_]\s*){3,}$)/;
// The text after a break must not start a block: a list item, a heading, or a fence.
const BLOCK_START = /^(?:[-*+]\s|\d{1,9}[.)]\s|#|`{3,}|~{3,})/;
// A line with code or data syntax: a brace, an assignment, a JSON key, or a JSON array.
const CODE_LIKE = /[{}=]|":|\[\s*(?:["'{[\d-]|$)/;
const ESM = /^\s*(?:import|export)\s/;
const UNDERLINE = /^\s*(?:=+|-+)\s*$/;
const CLOSERS = "\"')]*_”’";
const OPENERS = /[A-Z`["*_]/;

/** The ranges `[start, end)` of `text` that a split must not enter. */
function protectedRanges(text) {
  const ranges = [];
  const add = (re) => {
    for (const m of text.matchAll(re))
      ranges.push([m.index, m.index + m[0].length]);
  };
  for (const m of text.matchAll(/(`+)[\s\S]*?(?<!`)\1(?!`)/g))
    ranges.push([m.index, m.index + m[0].length]);
  add(/\[[^\]]*\]\([^)]*\)/g);
  add(/\]\[[^\]]*\]/g);
  add(/<[^<>\s][^<>]*>/g);
  add(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi);
  return ranges;
}

/** True when the word before the period at `at` ends no sentence. */
function abbreviation(text, at) {
  const word = text
    .slice(0, at)
    .match(/[^\s([]*$/)[0]
    .replace(/^["'*_]+/, "");
  if (/^[A-Z]$/.test(word)) return true;
  if (/\d\.\d+$/.test(word) || /^\d+$/.test(word)) return true;
  return ABBREVIATIONS.has(word.toLowerCase());
}

/** The sentences of one line body, without the prefix. */
function sentences(body) {
  const ranges = protectedRanges(body);
  const inside = (i) => ranges.some(([a, b]) => i >= a && i < b);
  const parts = [];
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if ((c !== "." && c !== "!" && c !== "?") || inside(i)) continue;
    let j = i + 1;
    while (j < body.length && (body[j] === c || CLOSERS.includes(body[j]))) j++;
    if (body[j] !== " ") continue;
    let k = j;
    while (body[k] === " ") k++;
    if (k >= body.length || !OPENERS.test(body[k]) || inside(k)) continue;
    if (BLOCK_START.test(body.slice(k))) continue;
    if (c === "." && j === i + 1 && abbreviation(body, i)) continue;
    parts.push(body.slice(start, j));
    start = k;
    i = k - 1;
  }
  parts.push(body.slice(start));
  return parts;
}

/** The set of line numbers in tables, in front matter, and in fences. */
function protectedLines(lines) {
  const skip = new Set();
  let fence = null;
  let block = null;
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n];
    if (n === 0 && line === "---") {
      const end = lines.findIndex(
        (l, i) => i > 0 && (l === "---" || l === "..."),
      );
      if (end > 0) for (let i = 0; i <= end; i++) skip.add(i);
      n = Math.max(end, 0);
      continue;
    }
    if (block) {
      skip.add(n);
      if (block.close.test(line)) block = null;
      continue;
    }
    const f = line.match(FENCE)?.[1];
    const opened = fence ? undefined : BLOCKS.find((b) => b.open.test(line));
    if (opened) {
      skip.add(n);
      // The block ends on its own line when the close token follows the open token.
      if (!opened.close.test(line.replace(opened.open, ""))) block = opened;
    } else if (fence) {
      skip.add(n);
      if (
        f &&
        f[0] === fence[0] &&
        f.length >= fence.length &&
        FENCE_END.test(line)
      )
        fence = null;
    } else if (f) {
      fence = f;
      skip.add(n);
    } else if (TABLE_RULE.test(line) && line.includes("|") && n > 0) {
      let top = n - 1;
      while (
        top > 0 &&
        lines[top - 1].trim() !== "" &&
        lines[top - 1].includes("|")
      )
        top--;
      for (let i = top; i <= n; i++) skip.add(i);
      for (
        let i = n + 1;
        i < lines.length && lines[i].trim() !== "" && lines[i].includes("|");
        i++
      )
        skip.add(i);
    }
  }
  return skip;
}

/** True when `line` has code or data syntax outside inline code and links. */
function codeLike(line) {
  const plain = line
    .replace(/(`+)[\s\S]*?(?<!`)\1(?!`)/g, "")
    .replace(/\[[^\]]*\]\([^)]*\)/g, "");
  return CODE_LIKE.test(plain);
}

/** The width of the leading white space of `line`, with a tab as four columns. */
const indentOf = (line) =>
  line.match(/^[ \t]*/)[0].replace(/\t/g, "    ").length;

/**
 * The formatted lines of `text` and the count of output lines for each input line.
 * `sembr` only splits a line and never joins, so the counts sum to the output length.
 */
function format(text) {
  const lines = String(text).split("\n");
  const skip = protectedLines(lines);
  const out = [];
  const counts = [];
  let listOpen = false;
  let listIndent = 0;
  let listCode = false;
  let esm = false;
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n];
    const list = line.match(LIST);
    const blank = line.trim() === "";
    if (list) {
      listOpen = true;
      listIndent = list[0].length;
      listCode = false;
    } else if (!blank && !/^\s/.test(line)) listOpen = false;
    if (blank) esm = false;
    else if (ESM.test(line)) esm = true;
    if (listOpen && !list && !blank && indentOf(line) >= listIndent + 4) {
      if (listCode || lines[n - 1].trim() === "") listCode = true;
    } else if (!blank) listCode = false;
    const indented = /^( {4}|\t)/.test(line) && (!listOpen || listCode);
    if (
      skip.has(n) ||
      indented ||
      esm ||
      SKIP_LINE.test(line) ||
      / {2,}$|\\$/.test(line) ||
      codeLike(line) ||
      UNDERLINE.test(lines[n + 1] ?? "x")
    ) {
      out.push(line);
      counts.push(1);
      continue;
    }
    const first = list ? list[0] : line.match(/^\s*(?:>\s*)*/)[0];
    const rest = line.slice(first.length);
    const quote = first.match(/^\s*(?:>\s*)*/)[0];
    const next = list ? quote + " ".repeat(first.length - quote.length) : first;
    const parts = sentences(rest);
    out.push(first + parts[0]);
    for (const part of parts.slice(1)) out.push(next + part);
    counts.push(parts.length);
  }
  return { out, counts };
}

/** `text` with a line break after each sentence end of a paragraph line. */
export function sembr(text) {
  return format(text).out.join("\n");
}

/** The count of output lines that `sembr` makes for each line of `text`. */
export function sembrCounts(text) {
  return format(text).counts;
}
