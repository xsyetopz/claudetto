// The checks of the `adherence` hooks (design D34, tier 1), as pure functions.
// `checkCall` gives the deny reasons and the ask reasons for one `PreToolUse` call.
// `io` holds the reads: `read(file)` gives the text of a file or null,
// `transcript(file)` gives `{ text, truncated }` or null, and `root` is the project folder.

import path from "node:path";
import { preToolUse } from "../../lib/hook-io.mjs";
import { isMarkdown } from "../../lib/text.mjs";
import { approved, claimReason, claims } from "./approval.mjs";
import { gitReason } from "./git.mjs";
import { namedByHooks } from "./hookscripts.mjs";
import {
  contentReasons,
  isTestPath,
  pathReasons,
  skipReasons,
} from "./kinds.mjs";
import {
  LIMIT_FILE_NAME,
  LINE_SHOWN_MAX_CHARS,
  SCAN_MAX_CHARS,
} from "./limits.mjs";
import { scriptTexts } from "./scripts.mjs";
import { shellWriteReasons } from "./shellwrites.mjs";
import { bareItems, commitMessage, spansReason } from "./spans.mjs";
import { added, change, FILE_TOOLS, lostLines } from "./text.mjs";

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
 * A test file is `*.test.*`, `*.spec.*`, `*_test.*`, `*_spec.*`, `test_*.py`, or a file in a `test`, `tests`, `Tests`, or `__tests__` folder (see `isTestPath`).
 * A limits file is `limits.*` or `budget.*`.
 * `ch` is the effect from `change`. Only a call that changes or removes an existing line of a test file asks.
 * For a limits file, only a changed or removed line with a number or a `const` declaration asks.
 * A call that only adds lines, and a call that does not apply to the file, get no ask.
 */
export function protectedReason(rel, ch) {
  const name = rel.split("/").at(-1);
  const isTest = isTestPath(rel);
  const isLimit = LIMIT_FILE_NAME.test(name);
  if ((!isTest && !isLimit) || ch.before === null || ch.after === null)
    return undefined;
  const lost = lostLines(ch.before, ch.after).filter((l) => l.trim() !== "");
  const hit = lost.find((l) => isTest || limitLine(l));
  if (hit === undefined) return undefined;
  const now = added((t) => t.split("\n"), ch).find((l) => l.trim() !== "");
  const change = now === undefined ? "removes it" : `writes \`${shown(now)}\``;
  return `The file \`${rel}\` is ${isTest ? "a test" : "a limits"} file.
This call changes or removes the existing line \`${shown(hit)}\` and ${change}.
A change to a test or a limit can hide the defect that the check exists to find.
To make a check pass, change the code and leave the check as it is.`;
}

/** The checks of a `Bash` command: the git ask, the ask for a write to a protected file, and the code spans of a commit message. */
function bashChecks(command, payload, io) {
  const out = { deny: [], ask: [] };
  const root = io.root || payload.cwd || "";
  const scripts = scriptTexts(command, root, io.read, io.home);
  const git = gitReason(command, scripts);
  if (git) out.ask.push(git);
  out.ask.push(...shellWriteReasons(command, root, io.read, scripts));
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
  const out = { deny: [], ask: [] };
  out.ask.push(...pathReasons(rel, namedByHooks(rel, root, io.read)));
  const text = ch.after ?? ch.fragment;
  if (text.length > SCAN_MAX_CHARS) {
    // The skipped-test and suppression checks work one line at a time, so they run on a long text too.
    out.ask.push(...skipReasons(rel, ch));
    return out;
  }
  if (isMarkdown(ch.file)) {
    const reason = spansReason(added((t) => bareItems(t), ch));
    if (reason) out.deny.push(reason);
  }
  const found = added(claims, ch);
  if (found.length && unapproved(payload.transcript_path, io))
    out.deny.push(claimReason(found));
  const guarded = protectedReason(rel, ch);
  if (guarded) out.ask.push(guarded);
  out.ask.push(...contentReasons(rel, ch));
  return out;
}

/** True when the transcript is readable, complete, and holds no approval. Any doubt returns false (fail open). */
function unapproved(file, io) {
  if (typeof file !== "string" || !file) return false;
  const t = io.transcript(file);
  return Boolean(t) && !t.truncated && !approved(t.text);
}

/** `io` with a `read` that reads each file one time for one hook call. */
function memoized(io) {
  const seen = new Map();
  const read = (file) => {
    if (!seen.has(file)) seen.set(file, io.read(file));
    return seen.get(file);
  };
  return { ...io, read };
}

/** The reasons for `payload`: `{ deny: string[], ask: string[] }`. */
export function checkCall(payload, raw) {
  const io = memoized(raw);
  const none = { deny: [], ask: [] };
  const input = payload?.tool_input;
  if (!input) return none;
  if (payload.tool_name === "Bash")
    return bashChecks(input.command, payload, io);
  if (FILE_TOOLS.has(payload.tool_name) && typeof input.file_path === "string")
    return fileChecks(payload, io);
  return none;
}

/** The `PreToolUse` output for the reasons `found`, or undefined. A deny wins over an ask. */
export function verdict({ deny, ask }) {
  const list = deny.length ? deny : ask;
  if (!list.length) return undefined;
  return preToolUse({
    permissionDecision: deny.length ? "deny" : "ask",
    permissionDecisionReason: list.join("\n\n"),
  });
}
