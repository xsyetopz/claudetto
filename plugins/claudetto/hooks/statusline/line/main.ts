import { branchOf, type Reader } from "./branch";
import { colorOff, paintOf } from "./color";
import { parse, type Rec, str, sub } from "./input";
import { renderRows } from "./rows";
import { type LiveState, readState, statePath } from "./state";

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

/** The rows for the JSON in `raw`. Pure: the clock, the environment and the files read are arguments. */
export const statusOf = (
	raw: string,
	env: Env,
	now: number,
	state?: LiveState,
	branch?: string
): string => {
	const input = parse(raw);
	if (input === undefined) {
		return FALLBACK;
	}
	const rows = renderRows(
		{ input, state, branch, paint: paintOf(!colorOff(env)), now },
		Math.max(1, columnsOf(env) - MARGIN)
	);
	return rows.length > 0 ? rows.join("\n") : FALLBACK;
};

const projectDirOf = (input: Rec): string | undefined => {
	const workspace = sub(input, "workspace");
	return str(workspace?.["project_dir"]) ?? str(workspace?.["current_dir"]);
};

/** Reads the session's state file and the branch, then renders. A missing file is no state. */
export const statusWithFiles = async (
	raw: string,
	env: Env,
	now: number,
	read: Reader
): Promise<string> => {
	const input = parse(raw);
	if (input === undefined) {
		return FALLBACK;
	}
	const config = configDirOf(env);
	const session = str(input["session_id"]);
	const dir = projectDirOf(input);
	const [text, branch] = await Promise.all([
		config === undefined || session === undefined
			? undefined
			: read(statePath(config, session)),
		dir === undefined ? undefined : branchOf(dir, read)
	]);
	return statusOf(raw, env, now, readState(text), branch);
};

/** Prints the status for the stdin text `raw`; never throws, and `FALLBACK` stands in for a failure. */
export const run = async (
	raw: string,
	env: Env,
	now: number,
	read: Reader
): Promise<string> => {
	try {
		return await statusWithFiles(raw, env, now, read);
	} catch {
		// A status line that throws is blanked by the engine; the fallback keeps it drawn.
		return FALLBACK;
	}
};
