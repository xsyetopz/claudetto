// The search covers code with comments left out, so a word in prose does not trip it.
// Usage: bun tools/rebuild/silent.ts

import { join } from "node:path";
import { lex, type Shipped, shippedSources } from "../source-text.ts";

export const TELEMETRY_NOUNS =
	/telemetry|tengu|analytics|event_logging|beacon/i;

export const NETWORK_CALLS: readonly RegExp[] = [
	/\bfetch\s*\(/,
	/\bXMLHttpRequest\b/,
	/\bWebSocket\b/,
	/\bEventSource\b/,
	/\bhttps?:\/\//,
	/\$\.(?:net|http)\b/,
];

export const silentFaults = (file: Shipped): readonly string[] =>
	lex(file.text)
		.code.split("\n")
		.flatMap((line, at) => {
			const noun = TELEMETRY_NOUNS.exec(line)?.[0];
			const call = NETWORK_CALLS.find((pattern) => pattern.test(line));
			return [
				...(noun === undefined
					? []
					: [
							`${file.path}:${at + 1}: holds the telemetry noun "${noun}", and the rebuild keeps none`,
						]),
				...(call === undefined
					? []
					: [
							`${file.path}:${at + 1}: matches the network pattern ${call}, and the rebuild fetches nothing`,
						]),
			];
		});

const main = async (): Promise<void> => {
	const root = join(import.meta.dir, "../..");
	const faults = (await shippedSources(root)).flatMap((file) =>
		silentFaults(file),
	);
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
