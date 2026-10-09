// The checks of the `adherence` hooks (design D34, tiers 1 and 2), as pure functions.
// `checkCall` gives the deny reasons and the ask reasons for one `PreToolUse` call.
// `io` holds the reads: `read(file)` gives the text of a file or null,
// `transcript(file)` gives `{ text, truncated }` or null, `rules` is the parsed project rules or null, and `root` is the project folder.

import path from "node:path";
import { approved, claimReason, claims } from "./approval.mjs";
import { gitReason } from "./git.mjs";
import { LINE_SHOWN_MAX_CHARS, SCAN_MAX_CHARS } from "./limits.mjs";
import { ruleReasons } from "./project.mjs";
import { bareItems, commitMessage, spansReason } from "./spans.mjs";
import { added, change, FILE_TOOLS, lostLines } from "./text.mjs";

/** True for a path of a Markdown file. */
export const isMarkdown = (file) => /\.mdx?$/i.test(file);

/** `line` trimmed and cut to `LINE_SHOWN_MAX_CHARS`. */
const shown = (line) => {
  const t = line.trim();
  return t.length > LINE_SHOWN_MAX_CHARS
    ? `${t.slice(0, LINE_SHOWN_MAX_CHARS)}...`
    : t;
};

/** True when a lost line of a limits file holds a number or a `const` declaration. Comment lines do not count. */
const limitLine = (line) =>
  !/^\s*(?:\/\/|\/\*|\*)/.test(line) &&
  (/\d/.test(line) || /^\s*(?:export\s+)?const\b/.test(line));

/**
 * The reason to ask before a change of `rel`, or undefined.
 * A test file is `*.test.*`, `*.spec.*`, or a file in a `test`, `tests`, or `__tests__` folder.
 * A limits file is `limits.*` or `budget.*`.
 * `ch` is the effect from `change`. Only a call that changes or removes an existing line of a test file asks.
 * For a limits file, only a changed or removed line with a number or a `const` declaration asks.
 * A call that only adds lines, and a call that does not apply to the file, get no ask.
 */
export function protectedReason(rel, ch) {
  const parts = rel.split("/");
  const name = parts[parts.length - 1];
  const isTest =
    /\.(?:test|spec)\.[^/]+$/.test(name) ||
    parts.slice(0, -1).some((p) => /^(?:tests?|__tests__)$/.test(p));
  const isLimit = /^(?:limits|budget)\.[^/]+$/.test(name);
  if ((!isTest && !isLimit) || ch.before === null || ch.after === null)
    return undefined;
  const lost = lostLines(ch.before, ch.after).filter((l) => l.trim() !== "");
  const hit = lost.find((l) => isTest || limitLine(l));
  if (hit === undefined) return undefined;
  const now = added((t) => t.split("\n"), ch).find((l) => l.trim() !== "");
  const change = now === undefined ? "removes it" : `writes \`${shown(now)}\``;
  return `The file \`${rel}\` is ${isTest ? "a test" : "a limits"} file.
This call changes or removes the existing line \`${shown(hit)}\` and ${change}.
A test or a limit changes only when the user asks, because the change can hide the defect that the check exists to find.
Ask the user, or change the code and leave this file as it is.`;
}

/** The checks of a `Bash` command: the git ask and the code spans of a commit message. */
function bashChecks(command) {
  const out = { deny: [], ask: [] };
  const git = gitReason(command);
  if (git) out.ask.push(git);
  const message = commitMessage(command);
  if (message !== undefined && message.length <= SCAN_MAX_CHARS) {
    const reason = spansReason(bareItems(message));
    if (reason) out.deny.push(reason);
  }
  return out;
}

/** The checks of a `Write`, `Edit`, or `MultiEdit` call. */
function fileChecks(payload, io) {
  const ch = change(payload, io.read);
  const root = io.root || payload.cwd || "";
  const rel = path.relative(root, ch.file).split(path.sep).join("/");
  const out = ruleReasons(io.rules, rel, ch);
  const text = ch.after ?? ch.fragment;
  if (text.length > SCAN_MAX_CHARS) return out;
  if (isMarkdown(ch.file)) {
    const reason = spansReason(added((t) => bareItems(t), ch));
    if (reason) out.deny.push(reason);
  }
  const found = added(claims, ch);
  if (found.length && unapproved(payload.transcript_path, io))
    out.deny.push(claimReason(found));
  const guarded = protectedReason(rel, ch);
  if (guarded) out.ask.push(guarded);
  return out;
}

/** True when the transcript is readable, complete, and holds no approval. Any doubt returns false (fail open). */
function unapproved(file, io) {
  if (typeof file !== "string" || !file) return false;
  const t = io.transcript(file);
  return Boolean(t) && !t.truncated && !approved(t.text);
}

/** The reasons for `payload`: `{ deny: string[], ask: string[] }`. */
export function checkCall(payload, io) {
  const none = { deny: [], ask: [] };
  const input = payload?.tool_input;
  if (!input) return none;
  if (payload.tool_name === "Bash") return bashChecks(input.command);
  if (FILE_TOOLS.has(payload.tool_name) && typeof input.file_path === "string")
    return fileChecks(payload, io);
  return none;
}

/** The `PreToolUse` output for the reasons `found`, or undefined. A deny wins over an ask. */
export function verdict({ deny, ask }) {
  const list = deny.length ? deny : ask;
  if (!list.length) return undefined;
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: deny.length ? "deny" : "ask",
      permissionDecisionReason: list.join("\n\n"),
    },
  };
}
