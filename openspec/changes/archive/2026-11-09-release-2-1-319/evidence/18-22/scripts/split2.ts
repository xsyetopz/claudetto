// Usage: bun split2.ts <runs dir> <sessions.jsonl>. Splits each session's output tokens by Stop-hook round and tags the block.
import { readFileSync } from "node:fs";
const [runs, jsonl] = [process.argv[2]!, process.argv[3]!];
const rows = readFileSync(jsonl, "utf8")
	.trim()
	.split("\n")
	.map((l) => JSON.parse(l));
const tag = (t: string): string =>
	/not committed|uncommitted/i.test(t)
		? "uncommitted"
		: /open item|offer/i.test(t)
			? "open-items"
			: /do not exist|not exist|missing/i.test(t)
				? "named-files"
				: /Stop hook feedback/.test(t)
					? "grade/other:" + t.slice(0, 80)
					: "other";
const acc: Record<string, Record<string, number>> = {};
const cnt: Record<string, Record<string, number>> = {};
const n: Record<string, number> = {};
for (const r of rows) {
	let text = "";
	try {
		text = readFileSync(`${runs}/${r.runId}/stdout.txt`, "utf8");
	} catch {
		continue;
	}
	if (r.tokens === 0) continue;
	n[r.arm] = (n[r.arm] ?? 0) + 1;
	const msgs = text
		.split("\n")
		.filter((l) => l.startsWith("{"))
		.map((l) => JSON.parse(l));
	const out = new Map<string, number>();
	let phase = "first";
	const bucket = (acc[r.arm] ??= {});
	const c = (cnt[r.arm] ??= {});
	const order: string[] = [];
	for (const m of msgs) {
		if (m.type === "user" && Array.isArray(m.message.content)) {
			const t = m.message.content
				.filter((b: any) => b.type === "text")
				.map((b: any) => b.text)
				.join(" ");
			if (/Stop hook feedback/.test(t)) {
				phase = tag(t);
				c[phase] = (c[phase] ?? 0) + 1;
			}
		}
		if (m.type === "system" && m.subtype === "thinking_tokens") {
			bucket[`${phase}`] =
				(bucket[`${phase}`] ?? 0) + (m.estimated_tokens_delta ?? 0);
		}
		if (m.type === "assistant") {
			const key = `${phase}`;
			const id = m.message.id;
			const prev = out.get(id) ?? 0;
			const now = Math.round(
				m.message.content.reduce(
					(s: number, b: any) =>
						s +
						(b.type === "text"
							? b.text.length / 4
							: b.type === "tool_use"
								? JSON.stringify(b.input).length / 3.5 + 8
								: 0),
					0,
				),
			);
			if (now > prev) {
				bucket[key] = (bucket[key] ?? 0) + (now - prev);
				out.set(id, now);
			}
		}
	}
	void order;
}
for (const a of Object.keys(acc)) {
	console.log(a, "sessions", n[a]);
	for (const [k, v] of Object.entries(acc[a]!))
		console.log(
			"  ",
			k,
			"mean out tokens/session",
			(v / n[a]!).toFixed(1),
			"blocks/session",
			((cnt[a]![k] ?? 0) / n[a]!).toFixed(2),
		);
}
