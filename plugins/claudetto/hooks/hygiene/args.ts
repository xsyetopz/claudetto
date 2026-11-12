export interface Args {
	readonly dryRun: boolean;
	readonly session?: string;
	readonly days?: number;
	readonly sessionDays?: number;
	readonly probeMinutes?: number;
	readonly trashDays?: number;
}

const NUMBER_FLAGS = new Map<
	string,
	"days" | "sessionDays" | "probeMinutes" | "trashDays"
>([
	["--days", "days"],
	["--session-days", "sessionDays"],
	["--probe-minutes", "probeMinutes"],
	["--trash-days", "trashDays"],
]);

const numberArg = (flag: string, value: string | undefined): number => {
	const n = Number(value);
	if (!Number.isInteger(n) || n < (flag === "--days" ? 1 : 0)) {
		throw new Error(`${flag} needs a whole number, and 0 turns a kind off`);
	}
	return n;
};

export const parseArgs = (argv: readonly string[]): Args => {
	const args: { -readonly [K in keyof Args]: Args[K] } = { dryRun: false };
	const rest = [...argv];
	for (let arg = rest.shift(); arg !== undefined; arg = rest.shift()) {
		const key = NUMBER_FLAGS.get(arg);
		if (arg === "--dry-run") {
			args.dryRun = true;
		} else if (arg === "--session") {
			args.session = rest.shift() ?? "";
		} else if (key === undefined) {
			throw new Error(`Unknown argument ${arg}`);
		} else {
			args[key] = numberArg(arg, rest.shift());
		}
	}
	return args;
};
