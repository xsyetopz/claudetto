import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { type SweepReport, type SweepRoots, sweep } from "./sweep.ts";
import { tempBases, tempRoots } from "./temp-roots.ts";

/** Claude Code's own default for `cleanupPeriodDays`. */
const DEFAULT_DAYS = 30;
const DEFAULT_PROBE_MINUTES = 60;
const TRAILING_SLASHES = /(.)\/+$/;

export interface HygieneArgs {
	readonly dryRun: boolean;
	readonly session?: string;
	readonly days?: number;
	readonly handoffDays?: number;
	readonly sessionDays?: number;
	readonly probeMinutes?: number;
}

/** What the process knows beside its env: the working directory, the clock, `cleanupPeriodDays`, the home folder, and the `claude-<uid>` roots found. */
export interface HygieneHost {
	readonly cwd: string;
	readonly now: number;
	readonly days: number;
	readonly home: string;
	readonly temps: readonly string[];
}

/** What a test may replace: the env, the folders searched for the temp root, the home folder, the working directory, and the user id. */
export interface HygieneInject {
	readonly env?: Readonly<Record<string, string | undefined>>;
	readonly bases?: readonly string[];
	readonly home?: string;
	readonly cwd?: string;
	readonly uid?: number;
}

const KIND_FLAGS = {
	"--handoff-days": "handoffDays",
	"--session-days": "sessionDays",
	"--probe-minutes": "probeMinutes",
} as const;

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
			case "--handoff-days":
			case "--session-days":
			case "--probe-minutes": {
				const value = Number(argValue(argv, ++at, arg));
				if (!Number.isInteger(value) || value < 0) {
					throw new Error(`${arg} needs a whole number, and 0 turns it off`);
				}
				args = { ...args, [KIND_FLAGS[arg]]: value };
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

/** The session id comes from `--session` or `CLAUDE_CODE_SESSION_ID`. `--days` sets the handoff and session limits unless their own flag is given, and the probe limit is 60 minutes unless `--probe-minutes` says otherwise. */
export const rootsOf = (
	args: HygieneArgs,
	env: Readonly<Record<string, string | undefined>>,
	host: HygieneHost,
): SweepRoots => ({
	temps: host.temps,
	project: host.cwd,
	sessions: join(configDir(env), "sessions"),
	current: args.session ?? env["CLAUDE_CODE_SESSION_ID"] ?? "",
	handoffDays: args.handoffDays ?? args.days ?? host.days,
	sessionDays: args.sessionDays ?? args.days ?? host.days,
	probeMinutes: args.probeMinutes ?? DEFAULT_PROBE_MINUTES,
	home: host.home,
	now: host.now,
	dryRun: args.dryRun,
});

export const reportText = (report: SweepReport, dryRun: boolean): string => {
	let bytes = 0;
	for (const entry of report.removed) {
		bytes += entry.bytes;
	}
	const refused = report.refused.map(
		(entry) =>
			`hygiene refused ${entry.root}: ${entry.reason}. Nothing was removed there.`,
	);
	const total = dryRun
		? `hygiene would remove ${report.removed.length} entries, ${bytes} B. Nothing was removed.`
		: `hygiene removed ${report.removed.length} entries, ${bytes} B.`;
	return [
		...refused,
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

/** Runs the sweep and returns the report text with the exit code. */
export const runMain = async (
	argv: readonly string[],
	inject: HygieneInject = {},
): Promise<{ code: number; text: string }> => {
	const args = parseArgs(argv);
	const env = inject.env ?? process.env;
	const temps = await tempRoots(
		inject.bases ?? tempBases(env),
		inject.uid ?? process.getuid?.() ?? 0,
	);
	const roots = rootsOf(args, env, {
		cwd: inject.cwd ?? process.cwd(),
		now: Date.now(),
		days: args.days ?? (await settingsDays(env)),
		home: inject.home ?? (env["HOME"] || homedir()),
		temps,
	});
	return { code: 0, text: reportText(await sweep(roots), args.dryRun) };
};

export const main = async (argv: readonly string[]): Promise<number> => {
	const { code, text } = await runMain(argv);
	console.info(text);
	return code;
};
