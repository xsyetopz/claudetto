// The scanner of the bundle text: it matches brackets and splits expressions
// and skips strings, template literals, regex literals, and comments.
// Every function is pure, so a test can run it on a fixture string.

export const ANCHOR = "{$schema:()=>";

const OPEN = "([{";
const CLOSE = ")]}";
const REGEX_AFTER = "(,=:[!&|?{};+-*%<>~^";
const KEYWORDS_BEFORE_REGEX = /(?:return|typeof|case|in|of|void|delete)$/;

// The index after the string, template, regex, or comment that starts at `i`.
// Returns `i` when none starts there.
export function skipToken(src, i, prev) {
  const c = src[i];
  if (c === '"' || c === "'") return skipQuoted(src, i, c);
  if (c === "`") return skipTemplate(src, i);
  if (c !== "/") return i;
  if (src[i + 1] === "/") {
    const end = src.indexOf("\n", i);
    return end < 0 ? src.length : end;
  }
  if (src[i + 1] === "*") return src.indexOf("*/", i + 2) + 2;
  const before = src.slice(Math.max(0, i - 8), i).trimEnd();
  const isRegex =
    prev === "" ||
    REGEX_AFTER.includes(prev) ||
    KEYWORDS_BEFORE_REGEX.test(before);
  return isRegex ? skipRegex(src, i) : i;
}

function skipQuoted(src, i, quote) {
  for (let j = i + 1; j < src.length; j++) {
    if (src[j] === "\\") j++;
    else if (src[j] === quote) return j + 1;
  }
  return src.length;
}

function skipTemplate(src, i) {
  for (let j = i + 1; j < src.length; j++) {
    if (src[j] === "\\") j++;
    else if (src[j] === "`") return j + 1;
    else if (src[j] === "$" && src[j + 1] === "{")
      j = matchClose(src, j + 1) ?? src.length;
  }
  return src.length;
}

function skipRegex(src, i) {
  let inClass = false;
  for (let j = i + 1; j < src.length; j++) {
    const c = src[j];
    if (c === "\\") j++;
    else if (c === "[") inClass = true;
    else if (c === "]") inClass = false;
    else if (c === "/" && !inClass) {
      let end = j + 1;
      while (/[a-z]/i.test(src[end] ?? "")) end++;
      return end;
    }
  }
  return src.length;
}

// Walks `src` from `from` and calls `visit(index, char, depth)` for each code character.
// `visit` returns true to stop.
// Depth is 0 before the first bracket, and the visit of a bracket sees the depth outside it.
function walk(src, from, visit) {
  let depth = 0;
  let prev = "";
  for (let i = from; i < src.length; i++) {
    const next = skipToken(src, i, prev);
    if (next !== i) {
      prev = "x";
      i = next - 1;
      continue;
    }
    const c = src[i];
    if (CLOSE.includes(c)) depth--;
    if (visit(i, c, depth)) return i;
    if (OPEN.includes(c)) depth++;
    if (!/\s/.test(c)) prev = c;
  }
  return null;
}

// The index of the bracket that closes the one at `open`, or null.
export function matchClose(src, open) {
  return walk(src, open, (_i, c, depth) => CLOSE.includes(c) && depth === 0);
}

// Splits `text` at the commas that are outside any bracket.
export function splitTop(text) {
  const parts = [];
  let start = 0;
  walk(text, 0, (i, c, depth) => {
    if (c === "," && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
    return false;
  });
  parts.push(text.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}

// The index where the expression that starts at `from` ends.
export function exprEnd(src, from) {
  const stop = walk(
    src,
    from,
    (_i, c, depth) =>
      (depth === 0 && (c === "," || c === ";")) ||
      (depth < 0 && CLOSE.includes(c)),
  );
  return stop ?? src.length;
}

// The body of the settings object (without braces), or null.
export function findSchemaBody(src) {
  const start = src.indexOf(ANCHOR);
  if (start < 0) return null;
  const end = matchClose(src, start);
  return end === null ? null : src.slice(start + 1, end);
}

const ESCAPES = {
  n: "\n",
  t: "\t",
  r: "\r",
  b: "\b",
  f: "\f",
  v: "\v",
  0: "\0",
};

// The value of a JavaScript string literal.
export function unquote(lit) {
  const body = lit.slice(1, -1);
  return body.replace(
    /\\(?:u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|([\s\S]))/g,
    (_m, u, x, c) =>
      u || x
        ? String.fromCharCode(Number.parseInt(u || x, 16))
        : (ESCAPES[c] ?? c),
  );
}

export function splitPlus(expr) {
  const parts = [];
  let start = 0;
  walk(expr, 0, (i, c, depth) => {
    if (c === "+" && depth === 0) {
      parts.push(expr.slice(start, i).trim());
      start = i + 1;
    }
    return false;
  });
  parts.push(expr.slice(start).trim());
  return parts;
}

// The `[name, args]` of each top-level method call in a chain such as `o().optional().describe("x")`.
export function chainCalls(expr) {
  const calls = [];
  let i = expr.search(/\(/);
  const head = expr.slice(0, i).trim();
  if (i < 0) return { head: expr.trim(), calls };
  let close = matchClose(expr, i);
  const headArgs = expr.slice(i + 1, close);
  i = close + 1;
  while (i < expr.length) {
    const m = /^\s*\.([\w$]+)\(/.exec(expr.slice(i));
    if (!m) break;
    const open = i + m[0].length - 1;
    close = matchClose(expr, open);
    if (close === null) break;
    calls.push([m[1], expr.slice(open + 1, close)]);
    i = close + 1;
  }
  return { head, headArgs, calls };
}

// The `[key, expr]` pairs of an object body.
// A conditional spread such as `...flag&&{key:()=>x}` gives the pairs of its object.
// Any other spread has no key and is skipped.
export function parseEntries(body, thunk) {
  const entries = [];
  for (const part of splitTop(body)) {
    const gated = /^\.\.\.[^{]*?&&\{/.exec(part);
    if (gated) {
      const open = gated[0].length - 1;
      const close = matchClose(part, open);
      if (close !== null)
        entries.push(...parseEntries(part.slice(open + 1, close), thunk));
      continue;
    }
    const m = (thunk ? /^([\w$]+):\(\)=>/ : /^([\w$]+):/).exec(part);
    if (m) entries.push([m[1], part.slice(m[0].length).trim()]);
  }
  return entries;
}
