// Usage: bun events.ts <runs dir> <sessions.jsonl>. Counts events per arm: denials by reason, tool errors, Stop blocks, assistant messages, reply words.
import { readFileSync } from "node:fs";
const [runs, jsonl] = [process.argv[2]!, process.argv[3]!];
const rows = readFileSync(jsonl, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const stat: Record<string, Record<string, number>> = {};
const n: Record<string, number> = {};
for (const r of rows) {
	if (r.tokens === 0) continue;
	let text = "";
	try {
		text = readFileSync(`${runs}/${r.runId}/stdout.txt`, "utf8");
	} catch {
		continue;
	}
	n[r.arm] = (n[r.arm] ?? 0) + 1;
	const s = (stat[r.arm] ??= {});
	const add = (k: string, v = 1) => (s[k] = (s[k] ?? 0) + v);
	const seen = new Set<string>();
	for (const l of text.split("\n")) {
		if (!l.startsWith("{")) continue;
		const m = JSON.parse(l);
		if (m.type === "system" && m.subtype === "permission_denied") add("denied:" + String(m.decision_reason ?? m.message).slice(0, 60));
		if (m.type === "assistant") {
			if (!seen.has(m.message.id)) add("assistant messages");
			seen.add(m.message.id);
			for (const b of m.message.content) {
				if (b.type === "tool_use") add("tool_use:" + b.name);
				if (b.type === "text") add("reply chars", b.text.length);
			}
		}
		if (m.type === "user" && Array.isArray(m.message.content)) {
			for (const b of m.message.content) {
				const t = b.type === "text" ? b.text : b.type === "tool_result" ? JSON.stringify(b.content) : "";
				if (/Stop hook feedback/.test(t)) add("stopblock:" + t.replace(/^Stop hook feedback:\s*/, "").slice(0, 50).replace(/\n/g, " "));
				if (/output shape/.test(t)) add("tool error: output shape");
			}
		}
	}
}
for (const a of Object.keys(stat)) {
	console.log(a, "sessions", n[a]);
	for (const [k, v] of Object.entries(stat[a]!).sort()) console.log("  ", k, "per session", (v / n[a]!).toFixed(2));
}
