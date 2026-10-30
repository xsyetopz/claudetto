// A value nobody read is an invention, so each constant must be in the note with its value.
// Usage: bun tools/rebuild/constants.ts

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	BORROWED,
	OWN,
} from "../../plugins/claudetto-you-should-know/src/constants.ts";

export const SOURCE_NOTE =
	"docs/keep/plugins/you-should-know-source-2.1.310.txt";

export type Constants = Readonly<Record<string, number | string>>;

/** Numbers lose thousands separators before the compare; a string is compared as it is. */
const written = (value: number | string): string =>
	typeof value === "number" ? String(value) : value;

const quotes = (line: string, name: string, value: string): boolean =>
	line.includes(`\`${name}\``) && line.includes(`\`${value}\``);

export const quoteFaults = (
	constants: Constants,
	note: string,
): readonly string[] => {
	const lines = note.split("\n");
	return Object.entries(constants)
		.filter(
			([name, value]) =>
				!lines.some((line) => quotes(line, name, written(value))),
		)
		.map(
			([name, value]) =>
				`\`${name}\` = \`${written(value)}\` is not quoted in ${SOURCE_NOTE}, so the rebuild would run on a value the source note does not record`,
		);
};

const main = async (): Promise<void> => {
	const root = join(import.meta.dir, "../..");
	const note = await readFile(join(root, SOURCE_NOTE), "utf8");
	const faults = [...quoteFaults(BORROWED, note), ...quoteFaults(OWN, note)];
	for (const line of faults) {
		console.error(line);
	}
	if (faults.length > 0) {
		process.exitCode = 1;
	}
};

if (import.meta.main) {
	await main();
}
