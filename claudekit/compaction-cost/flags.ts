// The flag parse of `main.ts`, apart from it so that a test reaches it without running the tool.

/** The value after `--name`, or none when the flag is absent. */
export const argOf = (
	args: readonly string[],
	name: string,
): string | undefined => {
	const at = args.indexOf(`--${name}`);
	return at === -1 ? undefined : args[at + 1];
};

/** Parses a comma-separated list, drops anything that is not a finite number above zero, and returns `fallback` when nothing is left. */
export const numbersOf = (
	text: string | undefined,
	fallback: number[],
): number[] => {
	const got = (text ?? "")
		.split(",")
		.map((part) => Number(part.trim()))
		.filter((value) => Number.isFinite(value) && value > 0);
	return got.length === 0 ? fallback : got;
};

/** One number, where zero counts, so that `--charge 0` turns the charge off. */
export const oneOf = (text: string | undefined, fallback: number): number => {
	const value = Number((text ?? "").trim());
	return text === undefined || !Number.isFinite(value) || value < 0
		? fallback
		: value;
};
