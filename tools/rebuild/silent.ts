// The rebuilt observer calls no telemetry noun and fetches nothing outside the machine. The only
// request it makes is the one `$.model.complete` of a check, which goes through the session's own
// provider. So the check searches the code of the plugin, comments left out, for the telemetry nouns
// and for the ways to reach a network, and fails on a hit.
//
//   bun tools/rebuild/silent.ts

import { join } from "node:path";
import { lex, type Shipped, shippedSources } from "../source-text.ts";

/** A word that names a telemetry call, an event, or a sender, whatever its case. */
export const TELEMETRY_NOUNS =
	/telemetry|tengu|analytics|event_logging|beacon/i;

/** A way to reach beyond the machine: a fetch, a socket, a stream, or a URL. */
export const NETWORK_CALLS: readonly RegExp[] = [
	/\bfetch\s*\(/,
	/\bXMLHttpRequest\b/,
	/\bWebSocket\b/,
	/\bEventSource\b/,
	/\bhttps?:\/\//,
	/\$\.(?:net|http)\b/,
];

/** One line per line of code in `file` that holds a telemetry noun or a network call. */
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
