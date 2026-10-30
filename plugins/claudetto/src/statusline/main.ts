import { colorOff, paintOf } from "./color.ts";
import { num, parse } from "./input.ts";
import { COLUMNS_MARGIN, DEFAULT_COLUMNS } from "./limits.ts";
import { renderRows } from "./rows.ts";
import { taskRows } from "./subagents.ts";

type Env = Readonly<Record<string, string | undefined>>;

/** Printed when the input is not a JSON object or holds nothing to show, since empty output would blank the line. */
const FALLBACK = "claudetto: no status";

const columnsOf = (env: Env): number => {
	const value = Number(env["COLUMNS"]);
	return Number.isInteger(value) && value > 0 ? value : DEFAULT_COLUMNS;
};

/** The lines of the main status line for the JSON in `raw`. Pure: the clock and the environment are arguments. */
export const statusOf = (raw: string, env: Env, now: number): string => {
	const input = parse(raw);
	if (!input) {
		return FALLBACK;
	}
	const room = Math.max(1, columnsOf(env) - COLUMNS_MARGIN);
	const rows = renderRows(input, paintOf(!colorOff(env)), now, room);
	return rows.length > 0 ? rows.join("\n") : FALLBACK;
};

/** The JSON lines of the subagent status line, or `""` so Claude Code keeps its default rows. The width is `columns` of the input, since this command gets no `COLUMNS`. */
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

/** Reads stdin and prints. It never throws and the exit code is always 0, because a non-zero exit blanks the line. */
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
			: statusOf(raw, env, now);
	} catch {
		out = args.includes("--subagent") ? "" : FALLBACK;
	}
	process.stdout.write(out === "" ? "" : `${out}\n`);
	return 0;
};
