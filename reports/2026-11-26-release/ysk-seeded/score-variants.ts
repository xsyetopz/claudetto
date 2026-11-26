// Scores the replay A/B in a drive.sh output folder run with YSK_VARIANTS. For each run, variant and
// replay index r, the r-th copy of every check stands for one session: its note is the first copy,
// in check order, whose learn line is not `none`. Positives score a hit when that note names the
// hidden change; negatives score a false alarm on any note.
// Usage: bun score-variants.ts <out-dir> [-v]
import { readdirSync, readFileSync } from "node:fs";

import { CASES } from "./cases";

const out = process.argv[2] ?? ".";
const verbose = process.argv.includes("-v");
const NONE = /^learn\s*:\s*none\b/iu;
interface Row {
	kind: string;
	variant?: string;
	status?: number;
	line?: string;
	usage?: Record<string, number>;
}
type Tally = {
	hits: number;
	positives: number;
	alarms: number;
	negatives: number;
	output: number;
	input: number;
};
const tallies: Record<string, Tally> = {};
for (const file of readdirSync(out)
	.filter((f) => f.endsWith(".jsonl"))
	.sort()) {
	const kase = CASES.find((c) => c.name === file.replace(/-\d+\.jsonl$/u, ""));
	if (kase === undefined) continue;
	const rows = readFileSync(`${out}/${file}`, "utf8")
		.trim()
		.split("\n")
		.filter(Boolean)
		.map((l) => JSON.parse(l) as Row);
	// Copies of one check are logged after its propose row and before the next check's copies end;
	// group them by the propose row they follow.
	const checks: Row[][] = [];
	for (const r of rows) {
		if (r.kind === "propose") checks.push([]);
		else if (r.kind === "variant" && r.status === 200) checks.at(-1)?.push(r);
	}
	const variants = [...new Set(checks.flat().map((r) => r.variant ?? ""))];
	for (const v of variants) {
		const t = (tallies[`${kase.set ?? "tune"} ${v}`] ??= {
			hits: 0,
			positives: 0,
			alarms: 0,
			negatives: 0,
			output: 0,
			input: 0
		});
		const copies = checks.map((c) => c.filter((r) => r.variant === v));
		for (const r of copies.flat()) {
			t.output += r.usage?.output_tokens ?? 0;
			t.input +=
				(r.usage?.input_tokens ?? 0) +
				(r.usage?.cache_read_input_tokens ?? 0) +
				(r.usage?.cache_creation_input_tokens ?? 0);
		}
		const sessions = Math.min(...copies.map((c) => c.length));
		for (let i = 0; i < sessions; i += 1) {
			const note = copies
				.map((c) => c[i]?.line ?? "")
				.find((l) => !NONE.test(l));
			if (kase.names === undefined) {
				t.negatives += 1;
				if (note !== undefined) t.alarms += 1;
			} else {
				t.positives += 1;
				if (note !== undefined && kase.names.test(note)) t.hits += 1;
			}
			if (verbose && note !== undefined)
				console.log(`${file} ${v}#${i}: ${note.slice(0, 150)}`);
		}
	}
}
for (const [k, t] of Object.entries(tallies).sort())
	console.log(
		`${k}: hits ${t.hits}/${t.positives}; false alarms ${t.alarms}/${t.negatives}; tokens in ${t.input}, out ${t.output}`
	);
