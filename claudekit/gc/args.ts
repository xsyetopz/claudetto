// The arguments of `gc`: the age limit in hours and the `--dry-run` switch.

export interface Args {
	/** Folders older than this many hours go. 0 turns the collector off. */
	readonly hours: number;
	readonly dryRun: boolean;
}

export const DEFAULT_HOURS = 24;

/** `[--hours N] [--dry-run]`. Throws on an unknown word, a missing value, or a negative or non-numeric `N`. */
export const parseArgs = (argv: readonly string[]): Args => {
	let hours = DEFAULT_HOURS;
	let dryRun = false;
	for (let i = 0; i < argv.length; i++) {
		const word = argv[i];
		switch (word) {
			case "--dry-run":
				dryRun = true;
				break;
			case "--hours": {
				const value = argv[++i];
				const n = value === undefined ? Number.NaN : Number(value);
				if (!(Number.isFinite(n) && n >= 0)) {
					throw new Error("`--hours` needs a number of hours, 0 or more");
				}
				hours = n;
				break;
			}
			default:
				throw new Error(
					`unknown argument \`${word}\`: gc [--hours N] [--dry-run]`,
				);
		}
	}
	return { hours, dryRun };
};
