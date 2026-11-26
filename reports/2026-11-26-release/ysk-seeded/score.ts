// Scores a drive.sh output folder. A run's note is its first propose reply that the plugin's own
// parser reads as a note to show; `learn: none`, an empty reply and a reply with no learn label
// show nothing. A positive case scores a hit when that note matches the case's `names`; a negative case
// scores a false alarm when any note shows. Also sums the side requests' usage.
// Usage: bun score.ts <out-dir>
import { readdirSync, readFileSync } from "node:fs";

import { parseProposedLine } from "../../../plugins/claudetto-you-should-know/hooks/request/parse";
import { CASES } from "./cases";

const out = process.argv[2] ?? ".";
interface Row {
	kind: string;
	status?: number;
	line?: string;
	text?: string;
	end?: boolean;
	usage?: Record<string, number>;
}
const total = { requests: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0 };
const lines: string[] = [];
const sets: Record<
	string,
	{
		hits: number;
		positives: number;
		alarms: number;
		negatives: number;
		broken: number;
	}
> = {};
for (const file of readdirSync(out)
	.filter((f) => f.endsWith(".jsonl"))
	.sort()) {
	const name = file.replace(/-\d+\.jsonl$/u, "");
	const kase = CASES.find((c) => c.name === name);
	if (kase === undefined) continue;
	const s = (sets[kase.set ?? "tune"] ??= {
		hits: 0,
		positives: 0,
		alarms: 0,
		negatives: 0,
		broken: 0
	});
	const rows = readFileSync(`${out}/${file}`, "utf8")
		.trim()
		.split("\n")
		.filter(Boolean)
		.map((l) => JSON.parse(l) as Row);
	const side = rows.filter((r) => r.kind === "propose" || r.kind === "recheck");
	for (const r of side) {
		total.requests += 1;
		total.input += r.usage?.input_tokens ?? 0;
		total.cacheRead += r.usage?.cache_read_input_tokens ?? 0;
		total.cacheWrite += r.usage?.cache_creation_input_tokens ?? 0;
		total.output += r.usage?.output_tokens ?? 0;
	}
	const ended = rows.some((r) => r.end === true);
	const proposals = side.filter(
		(r) => r.kind === "propose" && r.status === 200
	);
	const shown = proposals
		.map((r) => parseProposedLine(r.text ?? ""))
		.find((p) => p.kind === "line");
	const note = shown?.kind === "line" ? shown.line : undefined;
	let verdict: string;
	if (!ended || proposals.length === 0) {
		s.broken += 1;
		verdict = "BROKEN (turn did not end or no check ran)";
	} else if (kase.names === undefined) {
		s.negatives += 1;
		if (note !== undefined) s.alarms += 1;
		verdict = note === undefined ? "ok (no note)" : "FALSE ALARM";
	} else {
		s.positives += 1;
		const hit = note !== undefined && kase.names.test(note);
		if (hit) s.hits += 1;
		verdict = hit
			? "hit"
			: note === undefined
				? "MISS (no note)"
				: "MISS (other note)";
	}
	lines.push(
		`${file}: ${proposals.length} checks, ${verdict}${note === undefined ? "" : ` | ${note.slice(0, 140)}`}`
	);
}
console.log(lines.join("\n"));
for (const [set, s] of Object.entries(sets))
	console.log(
		`${set}: hits ${s.hits}/${s.positives}; false alarms ${s.alarms}/${s.negatives}; broken ${s.broken}`
	);
console.log(
	`side requests ${total.requests}: input ${total.input}, cache read ${total.cacheRead}, cache write ${total.cacheWrite}, output ${total.output}`
);
