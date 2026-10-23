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
import { SETTINGS_FILE } from "../../../kernel/paths.ts";
import { pluginOption } from "../../../kernel/plugin-option.ts";
import type { FileReader, ProcessRunner } from "../../../kernel/ports.ts";
import { tempDirs } from "../../../kernel/tmp.ts";
import { colorOff, paintOf } from "../color.ts";
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

/**
 * The `compaction` option is `built-in`.
 * Claude Code gives `CLAUDE_PLUGIN_OPTION_*` only to commands in a plugin `hooks.json`, and the `statusLine` command is in `settings.json`.
 * So the value comes from `pluginConfigs` in the user settings (a file that cannot be read or parsed gives the cause on stderr), and the env var wins when it is set.
 */
const builtInCompaction = async (deps: Deps): Promise<boolean> => {
  const dir = deps.env["CLAUDE_CONFIG_DIR"] || path.join(deps.home, ".claude");
  let settings: { pluginConfigs?: unknown } | null = null;
  try {
    const text = await deps.files.read(path.join(dir, SETTINGS_FILE));
    settings = text === null ? null : JSON.parse(text);
  } catch (err) {
    deps.error(failureText(err));
  }
  return (
    pluginOption("claudetto", COMPACTION_OPTION, deps.env, settings) ===
    BUILT_IN_COMPACTION
  );
};

/** The last `rate_limits` of the input go to this file in the temp folder, for the eval recipes. */
export const RATE_LIMITS_FILE = "claudetto-rate-limits.json";

/** An input with no `rate_limits` keeps the last content. A failed write goes to stderr and does not stop the line. */
const saveRateLimits = async (
  input: StatusInput,
  deps: Deps,
): Promise<void> => {
  if (!input.rate_limits) return;
  try {
    const [[dir]] = (await tempDirs(deps.env, async (d) => d)) as [
      [string, string],
    ];
    await deps.write(
      path.join(dir, RATE_LIMITS_FILE),
      JSON.stringify(input.rate_limits),
    );
  } catch (err) {
    deps.error(failureText(err));
  }
};

/** A status object can hold a number or `null` in a folder field, so only a non-empty string counts. */
const textOf = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

/**
 * Run the CLI and return 0, also after a failure, because a nonzero code would make Claude Code show an error on each refresh.
 * A failure prints the cause on stderr, and an empty row on stdout for the main line (the subagent rows keep the default look).
 */
export const main = async (
  args: string[],
  deps: Deps = defaults(),
): Promise<number> => {
  if (args.includes("--help")) {
    deps.log("Usage: claudetto-statusline [--subagent] < status.json");
    return 0;
  }
  const subagent = args.includes("--subagent");
  const columns =
    (Number(deps.env["COLUMNS"]) || DEFAULT_COLUMNS) - COLUMNS_MARGIN;
  try {
    const input: StatusInput & SubagentInput = JSON.parse(await deps.stdin());
    if (input === null || typeof input !== "object" || Array.isArray(input))
      throw new Error("the input is not a JSON object");
    const paint = paintOf(!colorOff(deps.env));
    if (subagent) {
      if (!Array.isArray(input.tasks))
        throw new Error("the input has no `tasks` array");
      for (const row of taskRows(input, deps.now(), columns, paint))
        deps.log(JSON.stringify(row));
      return 0;
    }
    await saveRateLimits(input, deps);
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
      paint,
      compact: false,
    };
    const statusOf = (compact: boolean) => ({ ...status, compact });
    deps.log(
      renderRows(SEGMENTS, SEGMENTS_ONE_ROW, statusOf, columns).join("\n"),
    );
  } catch (err) {
    deps.error(`claudetto-statusline failed: ${(err as Error).message}\n`);
    if (!subagent) deps.log("");
  }
  return 0;
};
