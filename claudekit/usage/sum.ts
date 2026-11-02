// Tokens of a week by project, model, and kind.

import { relative, sep } from "node:path";
import {
	callOf,
	inWindow,
	transcriptFiles,
	transcripts,
	type Window,
} from "./transcripts.ts";

export interface Row {
	calls: number;
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	readonly sessions: Set<string>;
}

// Throwaway projects of the classifier and dump runs get one row per kind, not one per run.
const FOLDED: readonly (readonly [RegExp, string])[] = [
	[/-private-tmp-claudetto-classifier-\w+-repo/, "tmp-classifier-*"],
	[/-private-tmp-claudekit-dump-\w+-work/, "tmp-claudekit-dump-*"],
];

const projectOf = (dir: string): string => {
	let name = dir;
	for (const [pattern, to] of FOLDED) {
		name = name.replace(pattern, to);
	}
	return name;
};

const weight = (row: Row): number => row.cacheRead + row.cacheWrite + row.input;

export const summarize = async (
	root: string,
	window: Window,
): Promise<Map<string, Row>> => {
	const groups = new Map<string, Row>();
	const seen = new Set<string>();
	const files = await transcriptFiles(root, window.since, true);
	for await (const { path: file, entries } of transcripts(files, '"usage"')) {
		const parts = relative(root, file).split(sep);
		const project = projectOf(parts[0] ?? "?");
		const nested = parts.includes("subagents");
		for (const entry of entries) {
			const call = callOf(entry);
			if (call === undefined || !inWindow(call, window) || seen.has(call.key)) {
				continue;
			}
			seen.add(call.key);
			const kind = call.sidechain || nested ? "subagent" : "main";
			const group = `${project}\t${call.model}\t${kind}`;
			const row = groups.get(group) ?? {
				calls: 0,
				input: 0,
				output: 0,
				cacheRead: 0,
				cacheWrite: 0,
				sessions: new Set<string>(),
			};
			row.calls += 1;
			row.input += call.input;
			row.output += call.output;
			row.cacheRead += call.read;
			row.cacheWrite += call.write;
			row.sessions.add(call.session);
			groups.set(group, row);
		}
	}
	return groups;
};

export const formatSum = (groups: ReadonlyMap<string, Row>): string => {
	const rows = [...groups].sort((a, b) => weight(b[1]) - weight(a[1]));
	const lines = [
		"project\tmodel\tkind\tsessions\tcalls\tinput\tcacheWrite\tcacheRead\toutput",
	];
	let tokens = 0;
	let calls = 0;
	let reads = 0;
	for (const [group, row] of rows) {
		lines.push(
			`${group}\t${row.sessions.size}\t${row.calls}\t${row.input}\t${row.cacheWrite}\t${row.cacheRead}\t${row.output}`,
		);
		tokens += weight(row) + row.output;
		calls += row.calls;
		reads += row.cacheRead;
	}
	const share = tokens === 0 ? 0 : (100 * reads) / tokens;
	lines.push(
		`total ${tokens} tokens in ${calls} calls, cache reads ${reads} (${share.toFixed(1)}%)`,
	);
	return lines.join("\n");
};
