import { readFileSync } from "node:fs";

import { bootstrapMean, wilson } from "../../18-5/harness.ts";
const [runs, jsonl] = [process.argv[2]!, process.argv[3]!];
const rows = readFileSync(jsonl, "utf8")
	.trim()
	.split("\n")
	.map((l) => JSON.parse(l));
const purpose = (cmd: string): string => {
	const test = /\bbun test\b/.test(cmd);
	const cat = /\b(cat|head|tail|sed -n)\s+[^|;&]*\.(ts|json|md)\b/.test(
		cmd.replace(/bun test[^;&]*/, ""),
	);
	if (/git (commit|add)/.test(cmd)) return "git commit or add";
	if (test && cat) return "tests plus a read";
	if (test) return "tests only";
	if (cat) return "file read only";
	if (/>|tee |sed -i/.test(cmd)) return "file writes";
	return "other";
};
const acc: Record<string, any> = {};
for (const r of rows) {
	const a = (acc[r.arm] ??= {
		n: 0,
		out: [] as number[],
		fixed: 0,
		turns: 0,
		calls: 0,
		toolSearch: 0,
		denials: 0,
		stopBlocks: 0,
		shape: 0,
		usd: 0,
		largest: 0,
		purposes: {} as Record<string, number>,
		extra: 0,
	});
	const text = readFileSync(`${runs}/${r.runId}/stdout.txt`, "utf8");
	a.n++;
	a.out.push(r.usage.output_tokens);
	a.fixed += r.m.fixed;
	a.turns += r.m.turns;
	a.usd += r.usd;
	a.largest = Math.max(a.largest, r.tokens);
	a.stopBlocks += r.m.stopBlocks;
	a.shape += r.m.shapeErrors;
	const seen = new Set<string>();
	for (const l of text.split("\n")) {
		if (!l.startsWith("{")) continue;
		const m = JSON.parse(l);
		if (m.type === "system" && m.subtype === "permission_denied") a.denials++;
		if (m.type !== "assistant") continue;
		for (const b of m.message.content) {
			if (b.type !== "tool_use" || seen.has(b.id)) continue;
			seen.add(b.id);
			a.calls++;
			if (b.name === "ToolSearch") {
				a.toolSearch++;
				a.extra++;
			}
			if (b.name === "Bash") {
				const p = purpose(String(b.input.command ?? ""));
				a.purposes[p] = (a.purposes[p] ?? 0) + 1;
			}
		}
	}
}
for (const [arm, a] of Object.entries<any>(acc)) {
	const [lo, hi] = bootstrapMean(a.out);
	const [wl, wh] = wilson(a.fixed, a.n);
	console.log(
		`${arm}: n=${a.n} output mean ${(a.out.reduce((s: number, v: number) => s + v, 0) / a.n).toFixed(1)} (bootstrap ${lo.toFixed(1)}-${hi.toFixed(1)}) turns/session ${(a.turns / a.n).toFixed(2)} tool calls/session ${(a.calls / a.n).toFixed(2)} ToolSearch ${(a.toolSearch / a.n).toFixed(2)} denials ${(a.denials / a.n).toFixed(2)} stopBlocks ${(a.stopBlocks / a.n).toFixed(2)} shapeErr sessions ${a.shape} fixed ${a.fixed}/${a.n} Wilson ${wl.toFixed(3)}-${wh.toFixed(3)} usd ${a.usd.toFixed(4)} largest ${a.largest}`,
	);
	console.log(
		"   bash by purpose per session:",
		Object.entries(a.purposes)
			.map(([k, v]) => `${k} ${v as number}`)
			.join("; "),
	);
}
