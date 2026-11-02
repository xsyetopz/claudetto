// What the re-read tokens consist of. The context growth to the next call is attributed by character share to
// what was added, and every later call re-reads it until the next compaction. The fixed prefix is the smallest
// prompt of a segment.

import { total } from "../../total.ts";
import { transcriptFiles, transcripts, type Window } from "../transcripts.ts";
import { ASSISTANT_OUTPUT, type Step, segmentsOf } from "./segments.ts";

export interface Reread {
	calls: number;
	totalRead: number;
	fixed: number;
	readonly weight: Map<string, number>;
	readonly toolsPerCall: Map<number, number>;
	readonly resultSize: Map<string, number[]>;
	// Growth over the previous output, for calls with thinking and a long output.
	readonly retained: number[];
}

const START = "segment start (summary, first prompt)";
const LONG_OUTPUT = 2000;

const add = <K>(map: Map<K, number>, key: K, by: number): void => {
	map.set(key, (map.get(key) ?? 0) + by);
};

const attribute = (stats: Reread, segment: readonly Step[]): void => {
	const base = Math.min(...segment.map((step) => step.prompt));
	segment.forEach((step, k) => {
		stats.calls += 1;
		stats.totalRead += step.prompt;
		stats.fixed += base;
		add(stats.toolsPerCall, step.tools, 1);
		const previous = segment[k - 1];
		if (previous === undefined) {
			add(stats.weight, START, step.prompt - base);
			return;
		}
		const growth = step.prompt - previous.prompt;
		// This call and every later one re-read the growth.
		const later = segment.length - k;
		// The previous call's output is part of the growth, and its tokens are known exactly.
		const own = Math.max(0, Math.min(growth, previous.output));
		if (previous.thinking && previous.output > LONG_OUTPUT) {
			stats.retained.push(growth / previous.output);
		}
		add(
			stats.weight,
			previous.thinking
				? `${ASSISTANT_OUTPUT} (with thinking)`
				: `${ASSISTANT_OUTPUT} (no thinking)`,
			own * later,
		);
		const rest = growth - own;
		if (rest <= 0) {
			return;
		}
		const parts = [...step.added].filter(([name]) => name !== ASSISTANT_OUTPUT);
		const chars = total(parts.map(([, size]) => size));
		if (chars === 0) {
			add(stats.weight, "unattributed", rest * later);
			return;
		}
		for (const [name, size] of parts) {
			add(stats.weight, name, ((rest * size) / chars) * later);
		}
	});
};

export const measureReread = async (
	root: string,
	window: Window,
): Promise<Reread> => {
	const stats: Reread = {
		calls: 0,
		totalRead: 0,
		fixed: 0,
		weight: new Map(),
		toolsPerCall: new Map(),
		resultSize: new Map(),
		retained: [],
	};
	const files = await transcriptFiles(root, window.since, false);
	for await (const { entries } of transcripts(files)) {
		const { segments, results } = segmentsOf(entries, window);
		for (const [name, sizes] of results) {
			stats.resultSize.set(name, [
				...(stats.resultSize.get(name) ?? []),
				...sizes,
			]);
		}
		for (const segment of segments) {
			if (segment.length > 0) {
				attribute(stats, segment);
			}
		}
	}
	return stats;
};

const billions = (value: number): string => `${(value / 1e9).toFixed(3)}B`;
const percent = (part: number, whole: number): string =>
	`${((100 * part) / whole).toFixed(1)}%`;
const at = (sorted: readonly number[], p: number): number =>
	sorted[Math.floor(sorted.length * p)] ?? 0;
export const formatReread = (stats: Reread): string => {
	const attributed = total([...stats.weight.values()]) + stats.fixed;
	const lines = [
		`calls ${stats.calls}, prompt tokens read in all ${billions(stats.totalRead)}, attributed ${billions(attributed)}`,
		`fixed prefix (smallest prompt of each segment, re-read by every call): ${billions(stats.fixed)}, ${percent(stats.fixed, stats.totalRead)}`,
	];
	const parts = [...stats.weight].sort((a, b) => b[1] - a[1]).slice(0, 25);
	for (const [name, value] of parts) {
		lines.push(
			`${name.padEnd(40)} ${billions(value)} ${percent(value, stats.totalRead)}`,
		);
	}
	const perCall = [...stats.toolsPerCall].sort((a, b) => a[0] - b[0]);
	lines.push(`tool calls per API call: ${JSON.stringify(perCall)}`);
	const growth = [...stats.retained].sort((a, b) => a - b);
	lines.push(
		`growth / previous output, calls with thinking and output > ${LONG_OUTPUT}: n ${growth.length}, p10 ${at(growth, 0.1).toFixed(2)}, median ${at(growth, 0.5).toFixed(2)}, p90 ${at(growth, 0.9).toFixed(2)}`,
	);
	const results = [...stats.resultSize]
		.sort((a, b) => total(b[1]) - total(a[1]))
		.slice(0, 10);
	for (const [name, sizes] of results) {
		const sorted = [...sizes].sort((a, b) => a - b);
		lines.push(
			`result chars ${name.padEnd(28)} n ${String(sorted.length).padStart(6)} median ${String(at(sorted, 0.5)).padStart(6)} p90 ${String(at(sorted, 0.9)).padStart(7)} p99 ${String(at(sorted, 0.99)).padStart(7)} sum ${(total(sorted) / 1e6).toFixed(1)}M`,
		);
	}
	return lines.join("\n");
};
