import { USAGE } from "../prompts.ts";
import { runBoth } from "./eval-both.ts";

export const main = async (argv: string[]): Promise<number> => {
	const [a, b, ...rest] = argv;
	if (argv.some((arg) => arg === "--help" || arg === "-h")) {
		process.stdout.write(`${USAGE}\n`);
		return 0;
	}
	if (!a || !b || a.startsWith("-") || b.startsWith("-")) {
		console.error(USAGE);
		return 2;
	}
	return runBoth(a, b, rest);
};
