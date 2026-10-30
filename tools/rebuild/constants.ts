// The rebuilt observer in `plugins/claudetto-you-should-know/` may run only on values that the
// source note records, because a value nobody read is an invention and the `builtin-rebuild` spec
// leaves out any behavior the note does not hold. So each entry of its constants module has to
// appear in the note on one line, with its name and its value together.
//
//   bun tools/rebuild/constants.ts

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	BORROWED,
	OWN,
} from "../../plugins/claudetto-you-should-know/src/constants.ts";

/** The note that has to quote every value, relative to the root of the tree. */
export const SOURCE_NOTE =
	"docs/keep/plugins/you-should-know-source-2.1.310.txt";

/** What a constants module holds: a name against a number or a fixed string. */
export type Constants = Readonly<Record<string, number | string>>;

/**
 * A number is written in the module with thousands separators and in the note without them, so both
 * forms are dropped to the digits before they are compared. A string is compared as it is.
 */
const written = (value: number | string): string =>
	typeof value === "number" ? String(value) : value;

/** Whether one line of the note names the constant and carries its value. */
const quotes = (line: string, name: string, value: string): boolean =>
	line.includes(`\`${name}\``) && line.includes(`\`${value}\``);

/** One line per constant the note does not quote, naming what the note is missing. */
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
