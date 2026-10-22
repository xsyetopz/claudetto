// The CLI `claudetto-statusline`, which the launcher `bin/claudetto-statusline` calls.
// With no argument it is the `statusLine` command: status JSON on stdin, up to `MAX_ROWS` rows on stdout.
// With `--subagent` it is the `subagentStatusLine` command: tasks JSON on stdin, one JSON row for each subagent.
// It calls no model and no network, and no program except `git`.

import os from "node:os";
import path from "node:path";
import {
  BUILT_IN_COMPACTION,
  COMPACTION_OPTION,
} from "../../../kernel/compaction.ts";
import { fileReader, writeAtomic } from "../../../kernel/node/fs.ts";
import { failureText, readStdin } from "../../../kernel/node/hook-io.ts";
import { processRunner } from "../../../kernel/node/process.ts";
import { CLAUDE_STATE_FILE, SETTINGS_FILE } from "../../../kernel/paths.ts";
import { pluginOption } from "../../../kernel/plugin-option.ts";
import type { FileReader, ProcessRunner } from "../../../kernel/ports.ts";
import { colorOff, paintOf, themeOf } from "../color.ts";
import { baseName } from "../format.ts";
import { COLUMNS_MARGIN, DEFAULT_COLUMNS } from "../limits.ts";
import { renderRows } from "../rows.ts";
import { SEGMENTS, SEGMENTS_ONE_ROW } from "../segments.ts";
import { taskRows } from "../subagents.ts";
import type { Status, StatusInput, SubagentInput } from "../types.ts";
import { activeChange } from "./change.ts";
import { cachedGitState } from "./git-cache.ts";

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

/** The JSON of `file`, or `null` for a missing file. A file that cannot be read or parsed gives `null` and the cause on stderr. */
const readJson = async (
  file: string,
  deps: Deps,
): Promise<{ theme?: unknown; pluginConfigs?: unknown } | null> => {
  try {
    const text = await deps.files.read(file);
    return text === null ? null : JSON.parse(text);
  } catch (err) {
    deps.error(failureText(err));
    return null;
  }
};

/**
 * The `compaction` option is `built-in`.
 * Claude Code gives `CLAUDE_PLUGIN_OPTION_*` only to commands in a plugin `hooks.json`, and the `statusLine` command is in `settings.json`.
 * So the value comes from `pluginConfigs` in the user settings, and the env var wins when it is set.
 */
const builtInCompaction = async (deps: Deps): Promise<boolean> => {
  const dir = deps.env["CLAUDE_CONFIG_DIR"] || path.join(deps.home, ".claude");
  const settings = await readJson(path.join(dir, SETTINGS_FILE), deps);
  return (
    pluginOption("claudetto", COMPACTION_OPTION, deps.env, settings) ===
    BUILT_IN_COMPACTION
  );
};

/** No color for `NO_COLOR`, otherwise the built-in theme named by the `theme` key of the config file of Claude Code. */
const paintFor = async (deps: Deps) => {
  if (colorOff(deps.env)) return paintOf(null);
  const dir = deps.env["CLAUDE_CONFIG_DIR"] || deps.home;
  const theme = (await readJson(path.join(dir, CLAUDE_STATE_FILE), deps))
    ?.theme;
  return paintOf(themeOf(typeof theme === "string" ? theme : null));
};

const USAGE = "Usage: claudetto-statusline [--subagent] < status.json";

/** A status object can hold a number or `null` in a folder field, so only a non-empty string counts. */
const textOf = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

/**
 * Run the CLI and return 0, also after a failure, because a failed status line must not stop Claude Code.
 * A nonzero code would make Claude Code show an error on each refresh.
 * A failure prints the cause on stderr, and an empty row on stdout for the main line (the subagent rows keep the default look).
 */
export const main = async (
  args: string[],
  deps: Deps = defaults(),
): Promise<number> => {
  if (args.includes("--help")) {
    deps.log(USAGE);
    return 0;
  }
  const subagent = args.includes("--subagent");
  const columns =
    (Number(deps.env["COLUMNS"]) || DEFAULT_COLUMNS) - COLUMNS_MARGIN;
  try {
    const input: StatusInput & SubagentInput = JSON.parse(await deps.stdin());
    if (input === null || typeof input !== "object" || Array.isArray(input))
      throw new Error("the input is not a JSON object");
    if (subagent) {
      if (!Array.isArray(input.tasks))
        throw new Error("the input has no `tasks` array");
      const paint = await paintFor(deps);
      for (const row of taskRows(input, deps.now(), columns, paint))
        deps.log(JSON.stringify(row));
      return 0;
    }
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
      compaction: await builtInCompaction(deps),
      now: deps.now(),
      paint: await paintFor(deps),
      compact: false,
    };
    deps.log(
      renderRows(
        SEGMENTS,
        SEGMENTS_ONE_ROW,
        (compact) => ({ ...status, compact }),
        columns,
      ).join("\n"),
    );
  } catch (err) {
    deps.error(`claudetto-statusline failed: ${(err as Error).message}\n`);
    if (!subagent) deps.log("");
  }
  return 0;
};
