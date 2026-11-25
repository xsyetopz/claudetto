import { branchOf, type Reader } from "./branch";
import { colorOff, paintOf } from "./color";
import { parse, type Rec, str, sub } from "./input";
import type { Resources } from "./resources";
import { renderRows } from "./rows";
import { type LiveState, readState, statePath } from "./state";
import { depthOf, themeOf } from "./theme";

type Env = Readonly<Record<string, string | undefined>>;

/** Printed when stdin is not a JSON object or holds nothing to show, so the line is never empty. */
const FALLBACK = "claudetto: no status";
/** The width when `COLUMNS` is absent or not a positive integer; 80 is the classic terminal width. */
const DEFAULT_COLUMNS = 80;
/** Columns kept free at the right edge, so a row never meets the `padding` of the `statusLine` setting. */
const MARGIN = 4;

const columnsOf = (env: Env): number => {
	const value = Number(env["COLUMNS"]);
	return Number.isInteger(value) && value > 0 ? value : DEFAULT_COLUMNS;
};

/** The Claude Code config folder: `CLAUDE_CONFIG_DIR`, else `~/.claude`. */
const configDirOf = (env: Env): string | undefined => {
	const config = env["CLAUDE_CONFIG_DIR"];
	if (config !== undefined && config !== "") {
		return config;
	}
	const home = env["HOME"];
	return home === undefined || home === "" ? undefined : `${home}/.claude`;
};

/** What the status line read besides stdin; each part is absent when its source is. */
export interface Seen {
	readonly state?: LiveState;
	readonly branch?: string;
	readonly resources?: Resources;
	/** The `theme` setting, as Claude Code names its themes. */
	readonly theme?: string;
}

/** The rows for the JSON in `raw`. Pure: the clock, the environment and what was read are arguments. */
export const statusOf = (
	raw: string,
	env: Env,
	now: number,
	seen: Seen = {}
): string => {
	const input = parse(raw);
	if (input === undefined) {
		return FALLBACK;
	}
	const paint = paintOf({
		on: !colorOff(env),
		theme: themeOf(seen.theme, env),
		depth: depthOf(env)
	});
	const rows = renderRows(
		{
			input,
			state: seen.state,
			branch: seen.branch,
			resources: seen.resources,
			paint,
			now
		},
		Math.max(1, columnsOf(env) - MARGIN)
	);
	return rows.length > 0 ? rows.join("\n") : FALLBACK;
};

/** The `theme` key of the settings JSON `raw`. */
const themeIn = (raw: string | undefined): string | undefined =>
	raw === undefined ? undefined : str(parse(raw)?.["theme"]);

/** Claude Code's global config, `.claude.json` in `CLAUDE_CONFIG_DIR` when set, else in the home folder. */
const globalConfigOf = (env: Env): string | undefined => {
	const config = env["CLAUDE_CONFIG_DIR"];
	if (config !== undefined && config !== "") {
		return `${config}/.claude.json`;
	}
	const home = env["HOME"];
	return home === undefined || home === "" ? undefined : `${home}/.claude.json`;
};

/**
 * The theme Claude Code draws with: the `theme` setting of the nearest
 * settings file (local, project, user), else the global config's, which
 * `/theme` writes. Each file is read only when the ones before set none.
 */
const themeOfFiles = async (
	env: Env,
	config: string | undefined,
	dir: string | undefined,
	read: Reader
): Promise<string | undefined> => {
	const paths = [
		dir === undefined ? undefined : `${dir}/.claude/settings.local.json`,
		dir === undefined ? undefined : `${dir}/.claude/settings.json`,
		config === undefined ? undefined : `${config}/settings.json`,
		globalConfigOf(env)
	].filter((path): path is string => path !== undefined);
	const texts = await Promise.all(paths.map((path) => read(path)));
	// Parsed in order and only until one names a theme: the global config runs to hundreds of kilobytes.
	for (const text of texts) {
		const theme = themeIn(text);
		if (theme !== undefined) {
			return theme;
		}
	}
	return undefined;
};

const projectDirOf = (input: Rec): string | undefined => {
	const workspace = sub(input, "workspace");
	return str(workspace?.["project_dir"]) ?? str(workspace?.["current_dir"]);
};

/** Reads the machine's figures; absent when the command passes no probe. */
export type Probe = () => Promise<Resources>;

/** Reads the session's state file, the branch, the theme and the machine, then renders. A missing file is no state. */
export const statusWithFiles = async (
	raw: string,
	env: Env,
	now: number,
	read: Reader,
	probe?: Probe
): Promise<string> => {
	const input = parse(raw);
	if (input === undefined) {
		return FALLBACK;
	}
	const config = configDirOf(env);
	const session = str(input["session_id"]);
	const dir = projectDirOf(input);
	const [text, branch, theme, resources] = await Promise.all([
		config === undefined || session === undefined
			? undefined
			: read(statePath(config, session)),
		dir === undefined ? undefined : branchOf(dir, read),
		themeOfFiles(env, config, dir, read),
		probe?.().catch((): Resources => ({}))
	]);
	const state = readState(text);
	return statusOf(raw, env, now, {
		...(state === undefined ? {} : { state }),
		...(branch === undefined ? {} : { branch }),
		...(theme === undefined ? {} : { theme }),
		...(resources === undefined ? {} : { resources })
	});
};

/** Prints the status for the stdin text `raw`; never throws, and `FALLBACK` stands in for a failure. */
export const run = async (
	raw: string,
	env: Env,
	now: number,
	read: Reader,
	probe?: Probe
): Promise<string> => {
	try {
		return await statusWithFiles(raw, env, now, read, probe);
	} catch {
		// A status line that throws is blanked by the engine; the fallback keeps it drawn.
		return FALLBACK;
	}
};
