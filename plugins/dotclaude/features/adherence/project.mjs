// The project rules of dotclaude (design D34, tier 2): a JSON file that the `setup` skill writes one time from `CLAUDE.md`.
// The file is `.claude/dotclaude-rules.json` in the project folder. The user reviews it before use.
//
//   {
//     "maxLines": [{ "glob": "**/*.md", "lines": 300 }],
//     "banned": [{ "glob": "plugins/**/*.mjs", "pattern": "\\bnode:fs\\b", "reason": "The hooks graph has no node import." }],
//     "ask": [{ "glob": "plugins/dotclaude/lib/budget.mjs", "reason": "A shared bound changes only on request." }]
//   }
//
// A `glob` is relative to the project folder. It supports `**`, `*`, `?`, and `{a,b}`.
// A `glob` with no slash matches the file name at any depth. A `pattern` is a JavaScript regular expression with the `m` flag.
// The loader drops each entry that is not valid, so a bad entry never blocks a call.
// The functions are pure.

import { PATTERN_MAX_CHARS, RULES_ENTRIES_MAX } from "./limits.mjs";
import { added, lineCount } from "./text.mjs";

/** The path of the rules file in a project folder. */
export const RULES_FILE = ".claude/dotclaude-rules.json";

const isText = (v) => typeof v === "string" && v !== "";

/** The regular expression of a glob. */
export function globRegex(glob) {
  let out = "";
  let depth = 0;
  const g = glob.replace(/^\.?\//, "");
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*" && g[i + 1] === "*") {
      const slash = g[i + 2] === "/";
      out += slash ? "(?:.*/)?" : ".*";
      i += slash ? 2 : 1;
    } else if (c === "*") out += "[^/]*";
    else if (c === "?") out += "[^/]";
    else if (c === "{") {
      out += "(?:";
      depth++;
    } else if (c === "}" && depth) {
      out += ")";
      depth--;
    } else if (c === "," && depth) out += "|";
    else out += c.replace(/[\\^$.|+()[\]{}]/g, "\\$&");
  }
  const body = depth ? out + ")".repeat(depth) : out;
  return new RegExp(g.includes("/") ? `^${body}$` : `(?:^|/)${body}$`);
}

/** True when the project path `rel` (posix, relative) matches `glob`. */
export const matches = (glob, rel) => globRegex(glob).test(rel);

/** The valid entries of `list` that pass `ok`, at most `RULES_ENTRIES_MAX`. */
function entries(list, ok) {
  return Array.isArray(list)
    ? list
        .filter((e) => e && typeof e === "object" && ok(e))
        .slice(0, RULES_ENTRIES_MAX)
    : [];
}

/** True when `pattern` compiles and is short. */
function pattern(p) {
  if (!isText(p) || p.length > PATTERN_MAX_CHARS) return false;
  try {
    new RegExp(p, "m");
    return true;
  } catch {
    return false;
  }
}

/** The rules of the text of a rules file, or null when the text is not a JSON object. */
export function parseRules(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return {
    maxLines: entries(
      raw.maxLines,
      (e) => isText(e.glob) && Number.isInteger(e.lines) && e.lines > 0,
    ),
    banned: entries(
      raw.banned,
      (e) => isText(e.glob) && pattern(e.pattern) && isText(e.reason),
    ),
    ask: entries(raw.ask, (e) => isText(e.glob) && isText(e.reason)),
  };
}

/**
 * The deny reasons and the ask reasons of the rules for one file call.
 * `rel` is the path relative to the project folder, and `ch` is the effect from `change` in `text.mjs`.
 * A file outside the project folder has no rule.
 */
export function ruleReasons(rules, rel, ch) {
  const out = { deny: [], ask: [] };
  if (!rules || rel.startsWith("../") || rel === "..") return out;
  for (const r of rules.maxLines) {
    if (!matches(r.glob, rel) || ch.after === null) continue;
    const now = lineCount(ch.after);
    if (now > r.lines && now > lineCount(ch.before ?? ""))
      out.deny.push(
        `The file \`${rel}\` would have ${now} lines, and the project bound for \`${r.glob}\` is ${r.lines} lines.
Split the file into files that each hold one concern, and write the call again.`,
      );
  }
  for (const r of rules.banned) {
    if (!matches(r.glob, rel)) continue;
    const re = new RegExp(r.pattern, "gm");
    const hits = added((t) => [...t.matchAll(re)].map((m) => m[0]), ch);
    if (hits.length)
      out.deny.push(
        `The new text for \`${rel}\` matches the banned pattern \`${r.pattern}\`: "${hits[0]}".
The project rule says: ${r.reason}
Write the call again without the banned text.`,
      );
  }
  for (const r of rules.ask) if (matches(r.glob, rel)) out.ask.push(r.reason);
  return out;
}
