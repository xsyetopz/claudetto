// Finds code items that a test title or a comment leaves outside inline code.
// The list is small on purpose, so that the check has no false match on prose.
// `Stop` is not in the list: it starts many plain sentences, such as "Stop
// when the budget ends", and the case of the word cannot tell it from the event.

const TOOLS = [
  "Read",
  "Write",
  "Edit",
  "Bash",
  "Grep",
  "Glob",
  "WebSearch",
  "WebFetch",
  "Agent",
  "Skill",
  "AskUserQuestion",
  "ToolSearch",
];
const EVENTS = [
  "PreToolUse",
  "PostToolUse",
  "SessionStart",
  "SubagentStop",
  "UserPromptSubmit",
];
// A tool name that starts a comment line is a verb, not a tool, so the first
// word of a comment line is exempt from this list only. A title has no exempt word.
const VERBS = new Set(["Read", "Write", "Edit", "Agent", "Skill", "Glob"]);
export const WORDS = [...TOOLS, ...EVENTS];

const NAMES = new RegExp(
  `(?<![\\w./\`-])(?:${WORDS.join("|")})(?![\\w-])`,
  "g",
);
const FILES =
  /(?<![\w`.])[\w-]+(?:\/[\w.-]+)*\.(?:mjs|ts|json|md|jsonl)(?![\w`])/g;
const TITLE =
  /\b(?:test|it|describe)(?:\.\w+)*\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
const COMMENT = /^\s*(?:\/\/|\/\*+|\*(?!\/))\s?(.*)$/;

function bare(text, lead) {
  const plain = text
    .replaceAll("\\`", "`")
    .replace(/\$\{[^}]*\}/g, "")
    .replace(/`[^`]*`/g, "");
  const found = [];
  for (const m of plain.matchAll(NAMES)) {
    const first = plain.slice(0, m.index).trim() === "";
    if (!(lead && first && VERBS.has(m[0]))) found.push(m[0]);
  }
  for (const m of plain.matchAll(FILES)) found.push(m[0]);
  return found;
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

/** Bare code items in test titles and full-line comments: `{ line, word }`. */
export function scan(text) {
  const hits = [];
  for (const m of text.matchAll(TITLE)) {
    const line = lineOf(text, m.index + m[0].indexOf(m[2]));
    for (const word of bare(m[2], false)) hits.push({ line, word });
  }
  const lines = text.split("\n");
  for (const [i, raw] of lines.entries()) {
    const c = COMMENT.exec(raw);
    // An indented comment line is a code example, such as a usage line.
    if (!c || /^(?:\s|#!|@ts-|biome-ignore)/.test(c[1])) continue;
    // A `*` line is a comment only inside a block comment.
    if (raw.trimStart().startsWith("*") && !inBlock(lines, i)) continue;
    for (const word of bare(c[1], true)) hits.push({ line: i + 1, word });
  }
  return hits.sort((a, b) => a.line - b.line);
}

function inBlock(lines, i) {
  for (let j = i - 1; j >= 0; j--) {
    if (lines[j].includes("*/")) return false;
    if (lines[j].includes("/*")) return true;
  }
  return false;
}
