import { readFileSync, readdirSync } from "node:fs";
const dir = "/tmp/probe-18-23b/runs/probe-18-23b";
const tr = (c: any): string => (typeof c === "string" ? c : Array.isArray(c) ? c.map((x) => x.text ?? "").join("") : "");
for (const id of readdirSync(dir)) {
	let raw: string; try { raw = readFileSync(`${dir}/${id}/stdout.txt`, "utf8"); } catch { continue; }
	if (!raw.includes("has not seen in full")) continue;
	const msgs = raw.split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
	let results = ""; let last = ""; const replies: string[] = [];
	for (const m of msgs) {
		if (m.type === "user") for (const b of m.message.content ?? []) { if (b.type === "tool_result") results += tr(b.content); if (b.type === "text" && b.text.includes("has not seen")) replies.push(last); }
		if (m.type === "assistant") for (const b of m.message.content) if (b.type === "text") last = b.text;
	}
	console.log("=====", id, "final:", last.replace(/\n/g, " ").slice(0, 150));
	for (const r of replies) {
		console.log("BLOCKED REPLY:", r.replace(/\n/g, " | ").slice(0, 700));
		const codes = [...r.matchAll(/`([^`\n]{6,})`/g)].map((x) => x[1]);
		console.log("  quoted code absent from results:", codes.filter((c) => !results.includes(c)).join(" ;; ") || "none");
		console.log("  has file:line:", /\S+\.\w+:\d+/.test(r), "| 'line N':", /line \d+/i.test(r));
	}
}
