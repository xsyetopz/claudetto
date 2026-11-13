import { colorOff, paintOf } from "./color";
import { hooksOff } from "./hooks-off";
import { parse, type Rec, str, sub } from "./input";
import { COLUMNS_MARGIN, DEFAULT_COLUMNS } from "./limits";
import { type Local, NO_LOCAL, readLine, readLocal } from "./local";
import { renderRows } from "./rows";

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
	colorOff(env) ? undefined : (theme ?? "dark");

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

/** Reads stdin and prints. It never throws and the exit code is always 0. */
export const main = async (): Promise<number> => {
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
		out = await statusWithFiles(raw, env, now);
	} catch {
		out = FALLBACK;
	}
	process.stdout.write(`${out}\n`);
	return 0;
};
