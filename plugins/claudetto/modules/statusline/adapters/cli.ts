// The CLI `claudetto-statusline`: status JSON on stdin gives up to `MAX_ROWS` rows, and `--subagent` with tasks JSON gives one JSON row for each subagent.
// It calls no model, no network, and no program except `git`.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileReader, writeAtomic } from "../../../kernel/node/fs.ts";
import { failureText, readStdin } from "../../../kernel/node/hook-io.ts";
import { processRunner } from "../../../kernel/node/process.ts";
import type { FileReader, ProcessRunner } from "../../../kernel/ports.ts";
import {
	PROJECT_LOCAL_SETTINGS,
	PROJECT_SETTINGS,
	SETTINGS_FILE,
} from "../../project/domain/paths.ts";
import { tempDirs } from "../../project/domain/tmp.ts";
import {
	BUILT_IN_COMPACTION,
	COMPACTION_OPTION,
} from "../../session/domain/compaction.ts";
import { colorOff, paintOf } from "../color.ts";
import { baseName } from "../format.ts";
import { COLUMNS_MARGIN, DEFAULT_COLUMNS } from "../limits.ts";
import { renderRows } from "../rows.ts";
import { SEGMENTS } from "../segments.ts";
import { type SubagentInput, taskRows } from "../subagents.ts";
import type { Status, StatusInput } from "../types.ts";
import type { WindowSources } from "../window.ts";
import { activeChange } from "./change.ts";
import { cachedGitState } from "./git-cache.ts";
import { safeLimitsFile, withLastLimits } from "./last-limits.ts";

/** The ports of `main`. A test gives fakes. */
export interface Deps {
	readonly stdin: () => Promise<string>;
	readonly env: Readonly<Record<string, string | undefined>>;
	readonly now: () => number;
	readonly cwd: string;
	readonly home: string;
	readonly files: FileReader;
	readonly write: (file: string, text: string) => Promise<void>;
	/** The limits file of a config folder, or `undefined` when its folder is not safe. */
	readonly limitsFile: (
		configDir: string,
	) => string | undefined | Promise<string | undefined>;
	readonly runner: ProcessRunner;
	readonly log: (line: string) => void;
	readonly error: (text: string) => void;
}

/** `writeAtomic` after it creates the folder of `file`, which is missing at the first write. */
export const writeInFolder = async (
	file: string,
	text: string,
): Promise<void> => {
	await fs.mkdir(path.dirname(file), { recursive: true });
	await writeAtomic(file, text);
};

const defaults = (): Deps => ({
	stdin: readStdin,
	env: process.env,
	now: Date.now,
	cwd: process.cwd(),
	home: os.homedir(),
	files: fileReader,
	write: writeInFolder,
	limitsFile: safeLimitsFile,
	runner: processRunner,
	log: (line) => process.stdout.write(`${line}\n`),
	error: (text) => process.stderr.write(text),
});

/** The parsed settings file, or `undefined` when it is missing or not valid JSON (the cause goes to stderr). */
const readSettings = async (
	deps: Deps,
	file: string,
): Promise<unknown | undefined> => {
	try {
		const text = await deps.files.read(file);
		return text === null ? undefined : JSON.parse(text);
	} catch (err) {
		deps.error(failureText(err));
		return undefined;
	}
};

/** The settings that a run reads, once: the user file, and the project files of `dir`. In the order of precedence. */
const readAllSettings = async (
	deps: Deps,
	dir: string,
): Promise<{ user: unknown; all: unknown[] }> => {
	const configDir =
		deps.env["CLAUDE_CONFIG_DIR"] || path.join(deps.home, ".claude");
	const [local, project, user] = await Promise.all([
		readSettings(deps, path.join(dir, PROJECT_LOCAL_SETTINGS)),
		readSettings(deps, path.join(dir, PROJECT_SETTINGS)),
		readSettings(deps, path.join(configDir, SETTINGS_FILE)),
	]);
	return { user, all: [local, project, user] };
};

const objectOf = (value: unknown): object =>
	typeof value === "object" && value !== null ? value : {};

/** The `compaction` option is `built-in`. A `statusLine` command gets no `CLAUDE_PLUGIN_OPTION_*`, so the value is also in `pluginConfigs` of the user settings, and the env var wins. */
const builtInCompaction = (deps: Deps, user: unknown): boolean => {
	const fromConfigs = Object.entries(
		objectOf(Reflect.get(objectOf(user), "pluginConfigs")),
	)
		.filter(([id]) => id.startsWith("claudetto@"))
		.map(([, config]) => config?.options?.[COMPACTION_OPTION])
		.find((value) => typeof value === "string");
	const fromEnv =
		deps.env[`CLAUDE_PLUGIN_OPTION_${COMPACTION_OPTION.toUpperCase()}`];
	return (fromEnv || fromConfigs) === BUILT_IN_COMPACTION;
};

/** The last `rate_limits` of the input go to this file in the temp folder, for the eval recipes. */
export const RATE_LIMITS_FILE = "claudetto-rate-limits.json";

/** An input with no `rate_limits` keeps the last content. A failed write goes to stderr and does not stop the line. */
const saveRateLimits = async (
	input: StatusInput,
	deps: Deps,
): Promise<void> => {
	if (!input.rate_limits) {
		return;
	}
	try {
		const [first] = await tempDirs(deps.env, async (d) => d);
		const dir = first?.[0];
		if (dir === undefined) {
			return;
		}
		await deps.write(
			path.join(dir, RATE_LIMITS_FILE),
			JSON.stringify(input.rate_limits),
		);
	} catch (err) {
		deps.error(failureText(err));
	}
};

/** A status object can hold a number or `null` in a folder field, so only a non-empty string counts. */
const textOf = (value: unknown): string | undefined =>
	typeof value === "string" && value !== "" ? value : undefined;

const messageOf = (err: unknown): string =>
	err instanceof Error ? err.message : String(err);

/** Run the CLI and return 0, also after a failure, because a nonzero code makes Claude Code show an error. A failure prints the cause on stderr, and an empty row for the main line. */
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
		if (input === null || typeof input !== "object" || Array.isArray(input)) {
			throw new Error("the input is not a JSON object");
		}
		const paint = paintOf(!colorOff(deps.env));
		const dir =
			textOf(input.workspace?.current_dir) ?? textOf(input.cwd) ?? deps.cwd;
		const settings = await readAllSettings(deps, dir);
		const windows: WindowSources = {
			env: deps.env["CLAUDE_CODE_AUTO_COMPACT_WINDOW"],
			settings: settings.all,
		};
		if (subagent) {
			if (!Array.isArray(input.tasks)) {
				throw new Error("the input has no `tasks` array");
			}
			for (const row of taskRows(input, deps.now(), columns, paint, windows)) {
				deps.log(JSON.stringify(row));
			}
			return 0;
		}
		await saveRateLimits(input, deps);
		// A read-only or foreign config folder is no fault of the user, so a failed read or write of the limits file prints nothing.
		const { limits, ages } = await withLastLimits(
			input,
			deps,
			() => undefined,
			await deps.limitsFile(
				deps.env["CLAUDE_CONFIG_DIR"] || path.join(deps.home, ".claude"),
			),
		);
		const status: Status = {
			input: { ...input, rate_limits: limits },
			ages,
			folder: baseName(dir),
			git: await cachedGitState(dir, deps, deps.error),
			change: await activeChange(
				textOf(input.workspace?.project_dir) ?? dir,
				deps.files,
				deps.error,
			),
			compaction: builtInCompaction(deps, settings.user),
			windows,
			now: deps.now(),
			paint,
			compact: false,
		};
		const statusOf = (compact: boolean) => ({ ...status, compact });
		deps.log(renderRows(SEGMENTS, statusOf, columns).join("\n"));
	} catch (err) {
		deps.error(`claudetto-statusline failed: ${messageOf(err)}\n`);
		if (!subagent) {
			deps.log("");
		}
	}
	return 0;
};
