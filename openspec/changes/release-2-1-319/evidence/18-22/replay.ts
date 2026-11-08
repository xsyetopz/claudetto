import { readFileSync } from "node:fs";
const dir = "/tmp/probe-18-23b/runs/probe-18-23b";
const rows = readFileSync(`${import.meta.dir}/../18-23/sessions.jsonl`, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const textOf = (c: any): string => (typeof c === "string" ? c : Array.isArray(c) ? c.map((x) => x.text ?? "").join("") : JSON.stringify(c));
let n = 0, past = 0, within = 0;
for (const r of rows.filter((x) => x.arm === "change")) {
	const msgs = readFileSync(`${dir}/${r.runId}/stdout.txt`, "utf8").split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
	const bug = /bug(\d+)/.exec(r.task)![1];
	const needle = `+ ${bug} + 1`;
	const results: string[] = [];
	for (const m of msgs) if (m.type === "user") for (const b of m.message.content ?? []) if (b.type === "tool_result") results.push(textOf(b.content));
	const last = results.slice(-8);
	const full = last.some((t) => t.includes(needle));
	const cut = last.some((t) => t.slice(0, 400).includes(needle));
	if (r.m.stopBlocks === 0) { console.log("clean", r.task, full, cut); } if (r.m.stopBlocks > 0) { n++; if (full && !cut) past++; if (cut) within++; console.log(r.task, "needle in full result:", full, "within first 400:", cut); }
}
console.log(`blocked ${n}: needle only past 400 chars in ${past}, within 400 in ${within}`);
