// The CLI `dotclaude-statusline` of the `statusline` slice. The launcher `bin/dotclaude-statusline` calls `main`.
//
//   dotclaude-statusline             the `statusLine` command: the status JSON on stdin, up to `MAX_ROWS` rows on stdout
//   dotclaude-statusline --subagent  the `subagentStatusLine` command: the tasks JSON on stdin, one JSON row for each subagent
//
// Claude Code runs the main command every `refreshInterval` seconds.
// The CLI calls no model and no network, and no program except `git`.
// It writes one file: the last `rate_limits` of the status object, at `RATE_LIMITS_FILE` of the project.
// A failure prints an empty row on stdout and the cause on stderr, so the status line stays up.

import path from "node:path";
import { fileReader, writeAtomic } from "../../../../../kernel/node/fs.ts";
import { failureText } from "../../../../../kernel/node/hook-io.ts";
import { processRunner } from "../../../../../kernel/node/process.ts";
import { readStdin } from "../../../../../kernel/node/stdin.ts";
import { RATE_LIMITS_FILE } from "../../../../../kernel/paths.ts";
import type { FileReader, ProcessRunner } from "../../../../../kernel/ports.ts";
import { activeProgress } from "../../../../../kernel/spec-store.ts";
import { colorOff, paintOf } from "../color.ts";
import { baseName } from "../domain/format.ts";
import { renderRows } from "../domain/rows.ts";
import type { Status, StatusInput, SubagentInput } from "../domain/types.ts";
import { usageChanged, usageSample } from "../domain/usage.ts";
import { COLUMNS_MARGIN, DEFAULT_COLUMNS } from "../limits.ts";
import { SEGMENTS, SEGMENTS_ONE_ROW } from "../segments.ts";
import { cachedGitState } from "./git-cache.ts";
import { taskRows } from "./subagents.ts";

/** The ports of `main`. A test gives fakes. */
export interface Deps {
  readonly stdin: () => Promise<string>;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly now: () => number;
  readonly cwd: string;
  readonly files: FileReader;
  readonly write: (file: string, text: string) => Promise<void>;
  readonly runner: ProcessRunner;
  readonly log: (line: string) => void;
  readonly error: (text: string) => void;
}

const defaults = (): Deps => ({
  stdin: readStdin,
  env: process.env,
  now: Date.now,
  cwd: process.cwd(),
  files: fileReader,
  write: writeAtomic,
  runner: processRunner,
  log: (line) => console.log(line),
  error: (text) => process.stderr.write(text),
});

/** The object in `text`, or null for text that is not a JSON object. */
export const parseInput = <T extends object>(text: string): T | null => {
  try {
    const value: unknown = JSON.parse(text);
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as T)
      : null;
  } catch {
    return null;
  }
};

/** A `FileReader` whose paths are relative to `root`. The spec store is relative to the project folder. */
const rooted = (root: string, files: FileReader): FileReader => ({
  read: (file) => files.read(path.join(root, file)),
  list: (dir) => files.list(path.join(root, dir)),
});

/** The active change of the spec store in `root`. A store that cannot be read gives null, and the cause goes to `deps.error`. */
const changeOf = async (
  root: string,
  deps: Deps,
): Promise<Status["change"]> => {
  try {
    return await activeProgress(rooted(root, deps.files));
  } catch (err) {
    deps.error(failureText(err));
    return null;
  }
};

/** Keeps the last `rate_limits` of `input` in `root`, and writes only when they differ from the saved sample or the sample is old. A failure goes to `deps.error`, and the row stays. */
const saveUsage = async (
  root: string,
  input: StatusInput,
  deps: Deps,
): Promise<void> => {
  const text = usageSample(input, deps.now());
  if (text === null) return;
  try {
    const saved = await rooted(root, deps.files).read(RATE_LIMITS_FILE);
    if (!usageChanged(saved, input, deps.now())) return;
    await deps.write(path.join(root, RATE_LIMITS_FILE), text);
  } catch (err) {
    deps.error(failureText(err));
  }
};

const columnsOf = (deps: Deps): number =>
  (Number(deps.env["COLUMNS"]) || DEFAULT_COLUMNS) - COLUMNS_MARGIN;

/** `value` when it is a non-empty string, otherwise null. A status object can hold a number or null in a folder field. */
const textOf = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

const mainLine = async (text: string, deps: Deps): Promise<string> => {
  const input = parseInput<StatusInput>(text);
  if (!input) return "";
  const dir =
    textOf(input.workspace?.current_dir) ?? textOf(input.cwd) ?? deps.cwd;
  const root = textOf(input.workspace?.project_dir) ?? dir;
  await saveUsage(root, input, deps);
  const status: Status = {
    input,
    folder: baseName(dir),
    git: await cachedGitState(dir, deps, deps.error),
    change: await changeOf(root, deps),
    now: deps.now(),
    paint: paintOf(!colorOff(deps.env)),
    compact: false,
  };
  return renderRows(
    SEGMENTS,
    SEGMENTS_ONE_ROW,
    (compact) => ({ ...status, compact }),
    columnsOf(deps),
  ).join("\n");
};

const subagentLines = (text: string, deps: Deps): string[] =>
  taskRows(
    parseInput<SubagentInput>(text) ?? {},
    deps.now(),
    columnsOf(deps),
    paintOf(!colorOff(deps.env)),
  ).map((row) => JSON.stringify(row));

/** Run the CLI with `args` and return the exit status. The status is 0, also after a failure, because a failed status line must not stop Claude Code. */
export const main = async (
  args: string[],
  deps: Deps = defaults(),
): Promise<number> => {
  const subagent = args.includes("--subagent");
  try {
    const text = await deps.stdin();
    if (subagent) for (const line of subagentLines(text, deps)) deps.log(line);
    else deps.log(await mainLine(text, deps));
  } catch (err) {
    // The main row stays empty, the subagent rows keep the default look of Claude Code, and stderr shows the cause.
    deps.error(failureText(err));
    if (!subagent) deps.log("");
  }
  return 0;
};
