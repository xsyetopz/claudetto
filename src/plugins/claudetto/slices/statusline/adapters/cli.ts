// The CLI `claudetto-statusline` of the `statusline` slice. The launcher `bin/claudetto-statusline` calls `main`.
//
//   claudetto-statusline             the `statusLine` command: the status JSON on stdin, up to `MAX_ROWS` rows on stdout
//   claudetto-statusline --subagent  the `subagentStatusLine` command: the tasks JSON on stdin, one JSON row for each subagent
//
// Claude Code runs the main command every `refreshInterval` seconds.
// The CLI calls no model and no network, and no program except `git`.
// A failure prints an empty row on stdout and the cause on stderr, so the status line stays up.

import os from "node:os";
import { BUILT_IN_COMPACTION } from "../../../../../kernel/compaction.ts";
import { fileReader, writeAtomic } from "../../../../../kernel/node/fs.ts";
import { failureText } from "../../../../../kernel/node/hook-io.ts";
import { processRunner } from "../../../../../kernel/node/process.ts";
import { readStdin } from "../../../../../kernel/node/stdin.ts";
import type { FileReader, ProcessRunner } from "../../../../../kernel/ports.ts";
import { colorOff, type Paint, paintOf } from "../color.ts";
import { baseName } from "../domain/format.ts";
import { renderRows } from "../domain/rows.ts";
import type { Status, StatusInput, SubagentInput } from "../domain/types.ts";
import { COLUMNS_MARGIN, DEFAULT_COLUMNS } from "../limits.ts";
import { SEGMENTS, SEGMENTS_ONE_ROW } from "../segments.ts";
import { themeOf } from "../theme.ts";
import { activeChange } from "./change.ts";
import { cachedGitState } from "./git-cache.ts";
import { readCompactionOption } from "./option.ts";
import { taskRows } from "./subagents.ts";
import { configFile, readThemeName } from "./theme.ts";

/** The ports of `main`. A test gives fakes. */
export interface Deps {
  readonly stdin: () => Promise<string>;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly now: () => number;
  readonly cwd: string;
  readonly home: string;
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
  home: os.homedir(),
  files: fileReader,
  write: writeAtomic,
  runner: processRunner,
  log: (line) => console.log(line),
  error: (text) => process.stderr.write(text),
});

/** The object in `text`. Text that is not a JSON object throws an error with the cause. */
export const parseInput = <T extends object>(text: string): T => {
  const value: unknown = JSON.parse(text);
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error("the input is not a JSON object");
  return value as T;
};

/** The colors: none for `NO_COLOR`, otherwise the built-in theme from the config file of Claude Code. */
const paintFor = async (deps: Deps): Promise<Paint> =>
  colorOff(deps.env)
    ? paintOf(null)
    : paintOf(
        themeOf(
          await readThemeName(
            configFile(deps.env, deps.home),
            deps.files,
            deps.error,
          ),
        ),
      );

const columnsOf = (deps: Deps): number =>
  (Number(deps.env["COLUMNS"]) || DEFAULT_COLUMNS) - COLUMNS_MARGIN;

/** `value` when it is a non-empty string, otherwise null. A status object can hold a number or `null` in a folder field. */
const textOf = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

const mainLine = async (text: string, deps: Deps): Promise<string> => {
  const input = parseInput<StatusInput>(text);
  const dir =
    textOf(input.workspace?.current_dir) ?? textOf(input.cwd) ?? deps.cwd;
  const status: Status = {
    input,
    folder: baseName(dir),
    git: await cachedGitState(dir, deps, deps.error),
    change: await activeChange(
      textOf(input.workspace?.project_dir) ?? dir,
      deps.files,
      deps.error,
    ),
    compaction:
      (await readCompactionOption(
        deps.env,
        deps.home,
        deps.files,
        deps.error,
      )) === BUILT_IN_COMPACTION,
    now: deps.now(),
    paint: await paintFor(deps),
    compact: false,
  };
  return renderRows(
    SEGMENTS,
    SEGMENTS_ONE_ROW,
    (compact) => ({ ...status, compact }),
    columnsOf(deps),
  ).join("\n");
};

const subagentLines = async (text: string, deps: Deps): Promise<string[]> => {
  const input = parseInput<SubagentInput>(text);
  if (!Array.isArray(input.tasks))
    throw new Error("the input has no `tasks` array");
  return taskRows(input, deps.now(), columnsOf(deps), await paintFor(deps)).map(
    (row) => JSON.stringify(row),
  );
};

/** Run the CLI with `args` and return the exit status. The status is 0, also after a failure, because a failed status line must not stop Claude Code. */
export const main = async (
  args: string[],
  deps: Deps = defaults(),
): Promise<number> => {
  const subagent = args.includes("--subagent");
  try {
    const text = await deps.stdin();
    if (subagent)
      for (const line of await subagentLines(text, deps)) deps.log(line);
    else deps.log(await mainLine(text, deps));
  } catch (err) {
    // The main row stays empty, the subagent rows keep the default look of Claude Code, and stderr shows the cause.
    deps.error(failureText(err));
    if (!subagent) deps.log("");
  }
  return 0;
};
