// Usage: bun tools/window-report.ts

import { homedir } from "node:os";
import { storedAt, storeFiles } from "../claudekit/store.ts";
import { reportText } from "../plugins/claudetto/src/blocks/window/report.ts";
import {
	ROWS_KEY,
	rowsOf,
	TURNS_KEY,
	turnsOf,
} from "../plugins/claudetto/src/blocks/window/window.ts";

const main = async (): Promise<void> => {
	const files = await storeFiles(homedir());
	const rows = files
		.flatMap((file) => rowsOf(storedAt(file, ROWS_KEY)))
		.toSorted((l, r) => l.at - r.at);
	const turns = files
		.flatMap((file) => turnsOf(storedAt(file, TURNS_KEY)))
		.toSorted((l, r) => l.at - r.at);
	console.info(reportText(rows, turns));
};

if (import.meta.main) {
	await main();
}
