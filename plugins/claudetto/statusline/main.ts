import { colorOff, paintOf } from "./color";
import { hooksOff } from "./hooks-off";
import { num, parse, type Rec, str, sub } from "./input";
import { COLUMNS_MARGIN, DEFAULT_COLUMNS } from "./limits";
import { type Local, NO_LOCAL, readLine, readLocal } from "./local";
import { renderRows } from "./rows";
import { taskRows } from "./subagents";

type Env = Readonly<Record<string, string | undefined>>;

/** Printed when the input is not a JSON object or holds nothing to show, a choice so the line is never empty. */
const FALLBACK = "claudetto: no status";

const columnsOf = (env: Env): number => {
	const value = Number(env["COLUMNS"]);
	return Number.isInteger(value) && value > 0 ? value : DEFAULT_COLUMNS;
};

const projectDirOf = (input: Rec): string | undefined => {
	const workspace = sub(input, "workspace");
	return (
		str(workspace?.["project_dir"]) ??
		str(workspace?.["current_dir"]) ??
		str(input["cwd"])
	);
};

/** The lines of the main status line for the JSON in `raw`. Pure: the clock and the environment are arguments. */
export const statusOf = (
	raw: string,
	env: Env,
	now: number,
	local: Local = NO_LOCAL,
): string => {
	const input = parse(raw);
	if (!input) {
		return FALLBACK;
	}
	const room = Math.max(1, columnsOf(env) - COLUMNS_MARGIN);
	const rows = renderRows(
		input,
		paintOf(themeOf(env, local.theme)),
		now,
		room,
		local,
	);
	return rows.length > 0 ? rows.join("\n") : FALLBACK;
};

const themeOf = (env: Env, theme: string | undefined): string | undefined =>
	colorOff(env) ? undefined : theme;

export const statusWithFiles = async (
	raw: string,
	env: Env,
	now: number,
): Promise<string> => {
	const input = parse(raw);
	const dir = input === undefined ? undefined : projectDirOf(input);
	if (input === undefined || dir === undefined) {
		return statusOf(raw, env, now, NO_LOCAL);
	}
	const [local, line, off] = await Promise.all([
		readLocal(dir),
		readLine(dir, str(input["session_id"])),
		hooksOff(input, dir, now),
	]);
	return statusOf(raw, env, now, {
		...local,
		...line,
		...(off ? { hooksOff: true } : {}),
	});
};

/** The JSON lines of the subagent status line, or `""` for no rows. The width is `columns` of the input, which the subagent input carries. */
export const subagentsOf = (
	raw: string,
	env: Env,
	now: number,
	theme?: string,
): string => {
	const input = parse(raw);
	if (!input) {
		return "";
	}
	const columns = num(input["columns"]) ?? columnsOf(env);
	const room = Math.max(1, columns - COLUMNS_MARGIN);
	return taskRows(input, now, room, paintOf(themeOf(env, theme)))
		.map((row) => JSON.stringify(row))
		.join("\n");
};

/** The subagent input names no project folder, so the theme is read under its `cwd`. */
export const subagentsWithFiles = async (
	raw: string,
	env: Env,
	now: number,
): Promise<string> => {
	const input = parse(raw);
	const dir = str(input?.["cwd"]);
	const { theme } =
		dir === undefined ? {} : await readLine(dir, str(input?.["session_id"]));
	return subagentsOf(raw, env, now, theme);
};

/** Reads stdin and prints. It never throws and the exit code is always 0, as a choice: a non-zero exit of the subagent command is logged as an error and its rows are dropped. */
export const main = async (args: readonly string[]): Promise<number> => {
	let raw = "";
	try {
		raw = await globalThis.Bun.stdin.text();
	} catch {
		raw = "";
	}
	const now = Date.now();
	const env = process.env;
	let out: string;
	try {
		out = args.includes("--subagent")
			? await subagentsWithFiles(raw, env, now)
			: await statusWithFiles(raw, env, now);
	} catch {
		out = args.includes("--subagent") ? "" : FALLBACK;
	}
	process.stdout.write(out === "" ? "" : `${out}\n`);
	return 0;
};
