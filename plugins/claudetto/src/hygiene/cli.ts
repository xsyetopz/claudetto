import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { type SweepReport, type SweepRoots, sweep } from "./sweep.ts";

/** Claude Code's own default for `cleanupPeriodDays`. */
const DEFAULT_DAYS = 30;
const TRAILING_SLASHES = /(.)\/+$/;

export interface HygieneArgs {
	readonly dryRun: boolean;
	readonly session?: string;
	readonly days?: number;
}

/** What the process knows beside its env: the user id, the working directory, the clock, and `cleanupPeriodDays`. */
export interface HygieneHost {
	readonly uid: number;
	readonly cwd: string;
	readonly now: number;
	readonly days: number;
}

const argValue = (
	argv: readonly string[],
	at: number,
	name: string,
): string => {
	const value = argv[at];
	if (value === undefined || value.startsWith("--")) {
		throw new Error(`${name} needs a value`);
	}
	return value;
};

export const parseArgs = (argv: readonly string[]): HygieneArgs => {
	let args: HygieneArgs = { dryRun: false };
	for (let at = 0; at < argv.length; at++) {
		const arg = argv[at];
		switch (arg) {
			case "--dry-run":
				args = { ...args, dryRun: true };
				break;
			case "--session":
				args = { ...args, session: argValue(argv, ++at, arg) };
				break;
			case "--days": {
				const days = Number(argValue(argv, ++at, arg));
				if (!Number.isInteger(days) || days < 1) {
					throw new Error("--days needs a whole number over 0");
				}
				args = { ...args, days };
				break;
			}
			default:
				throw new Error(`Unknown argument ${arg}`);
		}
	}
	return args;
};

const configDir = (env: Readonly<Record<string, string | undefined>>): string =>
	(
		env["CLAUDE_CONFIG_DIR"] || join(env["HOME"] || homedir(), ".claude")
	).replace(TRAILING_SLASHES, "$1");

/** The temp root follows `CLAUDE_CODE_TMPDIR`, which falls back to `/tmp`, and the session id comes from `--session` or `CLAUDE_CODE_SESSION_ID`. */
export const rootsOf = (
	args: HygieneArgs,
	env: Readonly<Record<string, string | undefined>>,
	host: HygieneHost,
): SweepRoots => ({
	temp: join(env["CLAUDE_CODE_TMPDIR"] || "/tmp", `claude-${host.uid}`),
	project: host.cwd,
	sessions: join(configDir(env), "sessions"),
	current: args.session ?? env["CLAUDE_CODE_SESSION_ID"] ?? "",
	days: args.days ?? host.days,
	now: host.now,
	dryRun: args.dryRun,
});

export const reportText = (report: SweepReport, dryRun: boolean): string => {
	let bytes = 0;
	for (const entry of report.removed) {
		bytes += entry.bytes;
	}
	const total = dryRun
		? `hygiene would remove ${report.removed.length} entries, ${bytes} B. Nothing was removed.`
		: `hygiene removed ${report.removed.length} entries, ${bytes} B.`;
	return [
		...report.removed.map(
			(entry) => `${entry.row}  ${entry.path}  ${entry.bytes} B`,
		),
		total,
	].join("\n");
};

const settingsDays = async (
	env: Readonly<Record<string, string | undefined>>,
): Promise<number> => {
	try {
		const days: unknown = JSON.parse(
			await readFile(join(configDir(env), "settings.json"), "utf8"),
		)?.cleanupPeriodDays;
		return typeof days === "number" && Number.isInteger(days) && days > 0
			? days
			: DEFAULT_DAYS;
	} catch {
		return DEFAULT_DAYS;
	}
};

export const main = async (argv: readonly string[]): Promise<number> => {
	const args = parseArgs(argv);
	const roots = rootsOf(args, process.env, {
		uid: process.getuid?.() ?? 0,
		cwd: process.cwd(),
		now: Date.now(),
		days: args.days ?? (await settingsDays(process.env)),
	});
	console.info(reportText(await sweep(roots), args.dryRun));
	return 0;
};
