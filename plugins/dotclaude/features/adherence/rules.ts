// The checks of the `adherence` hooks (design D34, tier 1), as pure functions.
// `checkCall` gives the ask reasons for one `PreToolUse` call, and `askReason` joins them into one text.
// `io` holds the reads: `read(file)` gives the text of a file or null, and `root` is the project folder.
// This file imports no hook helper, so the checks run with no Bun or Node global.

import { relative } from "../../lib/paths.ts";
import { gitReason } from "./git.ts";
import { namedByHooks } from "./hookscripts.ts";
import {
  contentReasons,
  isTestPath,
  pathReasons,
  skipReasons,
} from "./kinds.ts";
import {
  LIMIT_FILE_NAME,
  LINE_SHOWN_MAX_CHARS,
  SCAN_MAX_CHARS,
} from "./limits.ts";
import type { Scripts } from "./scripts.ts";
import { scriptTexts } from "./scripts.ts";
import { shellWriteReasons } from "./shellwrites.ts";
import type { Change, Payload, Reader } from "./text.ts";
import { added, change, FILE_TOOLS, lostLines } from "./text.ts";

/** The reads and the folders of the checks. `home` is the home folder, when the environment has one. */
export type Io = { read: Reader; root: string; home?: string | undefined };

/** The reasons of a call: `ask` lists the texts that Claude Code shows before the call runs. */
type Reasons = { ask: string[] };

/** `line` trimmed and cut to `LINE_SHOWN_MAX_CHARS`. */
const shown = (line: string): string => {
  const t = line.trim();
  return t.length > LINE_SHOWN_MAX_CHARS
    ? `${t.slice(0, LINE_SHOWN_MAX_CHARS)}...`
    : t;
};

/** True when a lost line of a limits file holds a number or a `const` declaration. Comment lines do not count. */
const limitLine = (line: string): boolean =>
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
export function protectedReason(rel: string, ch: Change): string | undefined {
  const name = rel.split("/").at(-1) as string;
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

/** The checks of a `Bash` command: the git ask and the ask for a write to a protected file. */
async function bashChecks(
  command: string,
  payload: Payload,
  io: Io,
): Promise<Reasons> {
  const out: Reasons = { ask: [] };
  const root = io.root || payload.cwd || "";
  const scripts: Scripts = await scriptTexts(command, root, io.read, io.home);
  const git = gitReason(command, scripts);
  if (git) out.ask.push(git);
  out.ask.push(...(await shellWriteReasons(command, root, io.read, scripts)));
  return out;
}

/** The checks of a `Write`, `Edit`, or `MultiEdit` call. */
async function fileChecks(payload: Payload, io: Io): Promise<Reasons> {
  const ch = await change(payload, io.read);
  const root = io.root || payload.cwd || "";
  const rel = relative(root, ch.file);
  const out: Reasons = { ask: [] };
  out.ask.push(...pathReasons(rel, await namedByHooks(rel, root, io.read)));
  const text = ch.after ?? ch.fragment;
  if (text.length > SCAN_MAX_CHARS) {
    // The skipped-test and suppression checks work one line at a time, so they run on a long text too.
    out.ask.push(...skipReasons(rel, ch));
    return out;
  }
  const guarded = protectedReason(rel, ch);
  if (guarded) out.ask.push(guarded);
  out.ask.push(...contentReasons(rel, ch));
  return out;
}

/** `io` with a `read` that reads each file one time for one hook call. */
function memoized(io: Io): Io {
  const seen = new Map<string, Promise<string | null>>();
  const read: Reader = (file) => {
    if (!seen.has(file)) seen.set(file, io.read(file));
    return seen.get(file) as Promise<string | null>;
  };
  return { ...io, read };
}

/** The reasons for `payload`: `{ ask: string[] }`. */
export async function checkCall(payload: Payload, raw: Io): Promise<Reasons> {
  const io = memoized(raw);
  const none: Reasons = { ask: [] };
  const input = payload?.tool_input;
  if (!input) return none;
  if (payload.tool_name === "Bash")
    return bashChecks(input.command as string, payload, io);
  if (
    FILE_TOOLS.has(payload.tool_name as string) &&
    typeof input.file_path === "string"
  )
    return fileChecks(payload, io);
  return none;
}

/** The ask text for `payload`: the reasons joined by a blank line, or null when no check asks. */
export async function askReason(
  payload: Payload,
  io: Io,
): Promise<string | null> {
  const { ask } = await checkCall(payload, io);
  return ask.length > 0 ? ask.join("\n\n") : null;
}
