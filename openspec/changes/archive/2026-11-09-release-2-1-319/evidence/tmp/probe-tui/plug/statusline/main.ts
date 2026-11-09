import { colorOff, paintOf } from "./color.ts";
import { hooksOff } from "./hooks-off.ts";
import { num, parse, type Rec, str, sub } from "./input.ts";
import { COLUMNS_MARGIN, DEFAULT_COLUMNS } from "./limits.ts";
import { type Local, NO_LOCAL, readLocal } from "./local.ts";
import { renderRows } from "./rows.ts";
import { taskRows } from "./subagents.ts";

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
	const rows = renderRows(input, paintOf(!colorOff(env)), now, room, local);
	return rows.length > 0 ? rows.join("\n") : FALLBACK;
};

export const statusWithFiles = async (
	raw: string,
	env: Env,
	now: number,
): Promise<string> => {
	const input = parse(raw);
	const dir = input ? projectDirOf(input) : undefined;
	if (!(input && dir)) {
		return statusOf(raw, env, now, NO_LOCAL);
	}
	const [local, off] = await Promise.all([
		readLocal(dir),
		hooksOff(input, dir, now),
	]);
	return statusOf(raw, env, now, off ? { ...local, hooksOff: true } : local);
};

/** The JSON lines of the subagent status line, or `""` for no rows. The width is `columns` of the input, which the subagent input carries. */
export const subagentsOf = (raw: string, env: Env, now: number): string => {
	const input = parse(raw);
	if (!input) {
		return "";
	}
	const columns = num(input["columns"]) ?? columnsOf(env);
	const room = Math.max(1, columns - COLUMNS_MARGIN);
	return taskRows(input, now, room, paintOf(!colorOff(env)))
		.map((row) => JSON.stringify(row))
		.join("\n");
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
			? subagentsOf(raw, env, now)
			: await statusWithFiles(raw, env, now);
	} catch {
		out = args.includes("--subagent") ? "" : FALLBACK;
	}
	process.stdout.write(out === "" ? "" : `${out}\n`);
	return 0;
};
