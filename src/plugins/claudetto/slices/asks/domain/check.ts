// The checks of the `asks` slice (design D34, tier 1), as pure functions.
// `askReason` gives the ask text for one `tool.check` call, and `checkCall` gives the reasons before they are joined.
// `io` holds the reads: `read(file)` gives the text of a file or `null`, and `root` is the project folder.
// This file imports no engine, so the checks run with no Bun or Node global.

import { RUN_CHECKS_BIN } from "../../../../../kernel/paths.ts";
import { parse } from "../../../../../kernel/shell.ts";
import { baseName, stripWrappers } from "../../../../../kernel/wrappers.ts";
import { SCAN_MAX_CHARS } from "../limits.ts";
import { downloadReason, type Facts } from "./download.ts";
import { gitReason } from "./git.ts";
import { namedByHooks } from "./hooks.ts";
import { contentReasons, skipReasons } from "./kinds.ts";
import { relative } from "./paths.ts";
import type { Scripts } from "./scripts.ts";
import { scriptTexts } from "./scripts.ts";
import type { LargeCheck, Payload, Reader } from "./text.ts";
import { change, FILE_TOOLS } from "./text.ts";
import { weakerReasons } from "./weaker.ts";
import { shellWriteReasons } from "./writes.ts";

/** The reads and the folders of the checks. `home` is the home folder, when the environment has one. */
export type Io = {
  read: Reader;
  large?: LargeCheck;
  root: string;
  home?: string | undefined;
  /** The facts of the environment for the download ask. Without it, that ask stays silent. */
  facts?: Facts;
};

/** The reasons of a call: `ask` lists the texts that Claude Code shows before the call runs. */
type Reasons = { ask: string[] };

/** The commands that a `claudetto-run-checks` call in `command` runs: its arguments that are not flags. */
const batchChecks = (command: string): string[] =>
  parse(command).commands.flatMap((argv) => {
    const [head, ...rest] = stripWrappers(argv);
    return head !== undefined && baseName(head) === RUN_CHECKS_BIN
      ? rest.filter((word) => !word.startsWith("-"))
      : [];
  });

/** The checks of a `Bash` command: the git ask and the ask for a write to a protected file. */
const bashChecks = async (
  command: string,
  payload: Payload,
  io: Io,
): Promise<Reasons> => {
  const out: Reasons = { ask: [] };
  const root = io.root || payload.cwd || "";
  const scripts: Scripts = await scriptTexts(command, root, io.read, io.home);
  const git = gitReason(command, scripts);
  if (git) out.ask.push(git);
  const download = io.facts && (await downloadReason(command, root, io.facts));
  if (download) out.ask.push(download);
  out.ask.push(...(await shellWriteReasons(command, root, io.read, scripts)));
  // Each argument of a batch is a command that the runner runs, so it meets the same asks as a `Bash` call.
  for (const check of batchChecks(command))
    out.ask.push(...(await bashChecks(check, payload, io)).ask);
  return out;
};

/** The checks of a `Write`, `Edit`, or `MultiEdit` call. */
const fileChecks = async (payload: Payload, io: Io): Promise<Reasons> => {
  const ch = await change(payload, io.read, io.large);
  const root = io.root || payload.cwd || "";
  const rel = relative(root, ch.file);
  const out: Reasons = { ask: [] };
  const named = await namedByHooks(rel, root, io.read);
  out.ask.push(...weakerReasons(rel, ch, named));
  const text = ch.after ?? ch.fragment;
  if (text.length > SCAN_MAX_CHARS) {
    // The skipped-test and suppression checks work one line at a time, so they run on a long text too.
    out.ask.push(...skipReasons(rel, ch));
    return out;
  }
  out.ask.push(...contentReasons(rel, ch));
  return out;
};

/** `io` with a `read` that reads each file one time for one hook call. */
const memoized = (io: Io): Io => {
  const seen = new Map<string, Promise<string | null>>();
  const read: Reader = (file) => {
    if (!seen.has(file)) seen.set(file, io.read(file));
    return seen.get(file) as Promise<string | null>;
  };
  return { ...io, read };
};

/** The reasons for `payload`: `{ ask: string[] }`. */
export const checkCall = async (
  payload: Payload,
  raw: Io,
): Promise<Reasons> => {
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
};

/** The ask text for `payload`: the reasons joined by a blank line, or `null` when no check asks. */
export const askReason = async (
  payload: Payload,
  io: Io,
): Promise<string | null> => {
  const { ask } = await checkCall(payload, io);
  return ask.length > 0 ? ask.join("\n\n") : null;
};
