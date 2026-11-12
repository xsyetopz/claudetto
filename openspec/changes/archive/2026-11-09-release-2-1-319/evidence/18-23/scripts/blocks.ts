import { readFileSync } from "node:fs";
const [runs, jsonl] = [process.argv[2]!, process.argv[3]!];
const rows = readFileSync(jsonl, "utf8")
	.trim()
	.split("\n")
	.map((l) => JSON.parse(l))
	.filter((r) => r.arm === "change");
const mean = (x: number[]): number =>
	x.length ? x.reduce((s, v) => s + v, 0) / x.length : 0;
const [blocked, clean] = [
	rows.filter((r) => r.m.stopBlocks > 0),
	rows.filter((r) => r.m.stopBlocks === 0),
];
console.log(
	`blocked ${blocked.length} sessions, output mean ${mean(blocked.map((r) => r.usage.output_tokens)).toFixed(1)}, turns ${mean(blocked.map((r) => r.m.turns)).toFixed(2)}; clean ${clean.length} sessions, output mean ${mean(clean.map((r) => r.usage.output_tokens)).toFixed(1)}, turns ${mean(clean.map((r) => r.m.turns)).toFixed(2)}`,
);
for (const r of blocked) {
	const t = readFileSync(`${runs}/${r.runId}/stdout.txt`, "utf8");
	const m = [...t.matchAll(/Stop hook feedback:\\n([^"]{0,160})/g)].map(
		(x) => x[1],
	);
	const firstReply = [
		...t.matchAll(/"type":"text","text":"((?:[^"\\]|\\.){0,200})/g),
	].map((x) => x[1]);
	console.log(r.task, "|", m[0], "| reply1:", firstReply[0]);
}
