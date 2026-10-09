// The code-span check (design D34, cases F1 to F3): find the code items of prose that no inline code holds.
// A code item is a file path, a file name with a known extension, a `snake_case`, `camelCase`, or `SCREAMING_CASE` name,
// a call such as `foo()`, a long CLI flag, or an env var.
// The list is narrow on purpose, so that an ordinary English word never matches.
// The functions are pure.

import { ITEMS_SHOWN_MAX } from "./limits.mjs";

const EXTENSIONS = new Set(
  "mjs cjs js ts tsx jsx json jsonl md mdx py rs go sh toml yaml yml css html txt lock".split(
    " ",
  ),
);
/** A path that starts with one of these folders is a path, even with one slash. */
const KNOWN_DIRS = new Set(
  "src lib tests plugins features hooks tools scripts bin dist node_modules skills agents wiki evals openspec schemas fixtures packages".split(
    " ",
  ),
);
const SEGMENT = /^[\w@.+-]+$/;

/** The lines of `text` without frontmatter, fenced blocks, and reference definitions. A removed line stays empty. */
function blankBlocks(text, fenced) {
  const lines = text.split("\n");
  let open = fenced ? { ch: "`", len: 3 } : null;
  let at = 0;
  if (!fenced && lines[0]?.trim() === "---") {
    const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
    if (end > 0) at = end + 1;
  }
  return lines.map((line, i) => {
    if (i < at) return "";
    const mark = /^\s*(?:>\s*)*(`{3,}|~{3,})(.*)$/.exec(line);
    if (open) {
      if (
        mark &&
        mark[1][0] === open.ch &&
        mark[1].length >= open.len &&
        !mark[2].trim()
      )
        open = null;
      return "";
    }
    if (mark) {
      open = { ch: mark[1][0], len: mark[1].length };
      return "";
    }
    return /^\s*\[[^\]]+\]:\s/.test(line) ? "" : line;
  });
}

/** `text` with the parts that are not prose blanked: fences, frontmatter, comments, inline code, link targets, URLs, tags, and mail addresses. */
export function prose(text, fenced = false) {
  return blankBlocks(text, fenced)
    .join("\n")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/(`+)(?:(?!\n[ \t]*\n)[\s\S])*?(?<!`)\1(?!`)/g, " ")
    .replace(/\]\([^)\n]*\)/g, "] ")
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, " ")
    .replace(/<[^<>\s][^<>\n]*>/g, " ")
    .replace(/\S+@\S+/g, " ");
}

/** True when `tok` is a path: a name with a slash, or a file with a known extension. */
function isPath(tok) {
  if (/^(?:\.{1,2}|~)\/./.test(tok)) return true;
  const segs = tok.split("/");
  const dir = tok.endsWith("/");
  if (dir) segs.pop();
  if (tok.startsWith("/")) {
    const rest = segs.slice(1);
    return rest.length >= 2 && rest.every((s) => SEGMENT.test(s));
  }
  if (!segs.every((s) => SEGMENT.test(s))) return false;
  const last = segs[segs.length - 1];
  const dot = last.lastIndexOf(".");
  const ext = dot < 0 ? "" : last.slice(dot + 1);
  // A name such as `Node.js` is a product, and not a file.
  const product =
    /^[A-Z][a-z]+$/.test(last.slice(0, dot)) && /^(?:js|ts)$/.test(ext);
  if (!dir && EXTENSIONS.has(ext) && !product) return true;
  if (segs.length === 1) return dir && KNOWN_DIRS.has(segs[0]);
  if (KNOWN_DIRS.has(segs[0]) || segs.some((s) => s.startsWith(".")))
    return true;
  return segs.length >= 3 && segs.some((s) => /[._]/.test(s));
}

/** True when `tok` is a code item that has no slash and no extension. */
function isName(tok) {
  return (
    /^--[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:=\S*)?$/.test(tok) ||
    /^\$\{?[A-Za-z_][A-Za-z0-9_]*\}?$/.test(tok) ||
    /^[A-Z_][A-Z0-9_]*=\S+$/.test(tok) ||
    /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/.test(tok) ||
    /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/.test(tok) ||
    // A camelCase name. `iOS`, `macOS`, and `iPhone` are product names.
    (/^[a-z]+[A-Z][A-Za-z0-9]*$/.test(tok) &&
      !/^[a-z]+[A-Z]+$/.test(tok) &&
      !/^[ei][A-Z][a-z]+$/.test(tok))
  );
}

/** True when `tok` is a call: empty parentheses, or a dotted name with arguments. */
const isCall = (tok) =>
  /^[A-Za-z_$][\w$]*(?:\.[\w$]+)*\(\)$/.test(tok) ||
  /^[A-Za-z_$][\w$]*(?:\.[\w$]+)+\([^\s()]*\)$/.test(tok);

/** The code items of `text` that no inline code holds, each once, in order. `fenced` is true when `text` starts inside a fenced block. */
export function bareItems(text, fenced = false) {
  const found = [];
  for (const raw of prose(text, fenced).split(/\s+/)) {
    let tok = raw.replace(/^[[("'*_<{]+/, "").replace(/[.,;:!?"'*_>\]]+$/, "");
    if (!isCall(tok)) tok = tok.replace(/\)+$/, "");
    tok = tok.replace(/(?::\d+(?:-\d+)?)+$/, "");
    if (tok && (isCall(tok) || isName(tok) || isPath(tok))) found.push(tok);
  }
  return [...new Set(found)];
}

/** The deny reason for `items`, or undefined for none. The text is a message to Claude. */
export function spansReason(items) {
  if (!items.length) return undefined;
  const shown = items.slice(0, ITEMS_SHOWN_MAX).map((i) => `\`${i}\``);
  const more = items.length - shown.length;
  const list =
    more > 0 ? `${shown.join(", ")}, and ${more} more` : shown.join(", ");
  return `The new text has code items with no code span: ${list}.
A reader sees which words are code only when each code item is in single backticks.
Write the call again with each of these items in single backticks.`;
}

/**
 * The prose of a `git commit` command: the quoted heredoc messages and the quoted `-m` values.
 * It returns undefined for a command that has no message text that the function can read.
 * Trailer lines, such as `Co-Authored-By: Name <mail>`, are not prose and the mail filter of `prose` removes them.
 */
export function commitMessage(command) {
  const text = String(command ?? "");
  if (!/(?:^|[\s;&|(])git\s+(?:-\S+\s+\S+\s+)*commit\b/.test(text))
    return undefined;
  const parts = [];
  for (const m of text.matchAll(/<<-?\s*(["']?)([A-Za-z_]\w*)\1[ \t]*\n/g)) {
    const body = text.slice(m.index + m[0].length).split("\n");
    const end = body.indexOf(m[2]);
    if (end >= 0) parts.push(body.slice(0, end).join("\n"));
  }
  for (const m of text.matchAll(
    /(?:^|\s)(?:-m|--message)(?:\s+|=)(?:"((?:[^"\\$`]|\\.)*)"|'([^']*)')/g,
  ))
    parts.push(m[1] ?? m[2]);
  return parts.length ? parts.join("\n\n") : undefined;
}
