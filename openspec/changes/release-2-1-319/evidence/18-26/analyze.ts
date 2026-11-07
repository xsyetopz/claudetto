// Offline cache analysis of paid stream-json runs (no paid call).
// Usage: bun analyze.ts <probe-dir>...   prints markdown tables (a), (b), (c) and the break list.
// Text is estimated at chars/4. Assistant frames are deduped by message.id (the last frame of an id wins).
// A row is a run with a sessions.jsonl row and a finished stdout.txt (a `result` frame).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

type Usage = { input_tokens: number; cache_creation_input_tokens: number; cache_read_input_tokens: number; output_tokens: number; cache_creation?: { ephemeral_5m_input_tokens: number; ephemeral_1h_input_tokens: number } };
type Turn = { lost: number; usage: Usage; kind: "start" | "block" | "denial" | "result"; tailTok: number; exactTail: number; replyTok: number; userChars: number };
type Session = { arm: string; blocked: boolean; turns: Turn[] };

const walk = (d: string, out: string[] = []): string[] => {
	for (const e of readdirSync(d)) {
		if (["seed", "work", "arm", "config"].includes(e)) continue;
		const p = join(d, e);
		if (statSync(p).isDirectory()) walk(p, out);
		else if (e === "sessions.jsonl" || e === "stdout.txt") out.push(p);
	}
	return out;
};
const textLen = (c: unknown): number =>
	typeof c === "string" ? c.length : Array.isArray(c) ? c.reduce((n: number, b: { text?: unknown; content?: unknown }) => n + textLen(b?.text ?? b?.content ?? ""), 0) : 0;

const files = process.argv.slice(2).flatMap((d) => (existsSync(d) ? walk(d) : []));
const rows = new Map<string, { arm: string; blocked: boolean }>();
for (const f of files.filter((f) => f.endsWith("sessions.jsonl")))
	for (const l of readFileSync(f, "utf8").split("\n").filter(Boolean)) {
		const r = JSON.parse(l);
		rows.set(r.runId, { arm: r.arm === "change" ? "plugin" : r.arm, blocked: r.blocked === true || (r.m?.stopBlocks ?? 0) > 0 });
	}

const sessions: Session[] = [];
for (const f of files.filter((f) => f.endsWith("stdout.txt"))) {
	const row = rows.get(f.split("/").at(-2) ?? "");
	if (!row) continue;
	const msgs: { id: string; usage: Usage }[] = [];
	const between: { block: number; deny: number; other: number }[] = [];
	let cur = { block: 0, deny: 0, other: 0 };
	let done = false;
	for (const l of readFileSync(f, "utf8").split("\n").filter(Boolean)) {
		const o = JSON.parse(l);
		if (o.type === "result") done = true;
		else if (o.type === "assistant") {
			if (msgs.at(-1)?.id === o.message.id) msgs[msgs.length - 1].usage = o.message.usage;
			else {
				if (msgs.length) between.push(cur);
				cur = { block: 0, deny: 0, other: 0 };
				msgs.push({ id: o.message.id, usage: o.message.usage });
			}
		} else if (o.type === "user")
			for (const b of Array.isArray(o.message.content) ? o.message.content : []) {
				const n = textLen(b.content ?? b.text ?? "");
				if (b.type === "text" && String(b.text).startsWith("Stop hook feedback")) cur.block += n;
				else if (b.type === "tool_result" && b.is_error) cur.deny += n;
				else cur.other += n;
			}
	}
	if (!done) continue;
	sessions.push({
		...row,
		turns: msgs.map((m, i) => {
			const u = i ? between[i - 1] : { block: 0, deny: 0, other: 0 };
			const replyTok = i ? msgs[i - 1].usage.output_tokens : 0;
			const userChars = u.block + u.deny + u.other;
				const total = (x: Usage) => x.input_tokens + x.cache_creation_input_tokens + x.cache_read_input_tokens;
				const exactTail = i ? total(m.usage) - total(msgs[i - 1].usage) : 0;
			return { lost: i ? msgs[i - 1].usage.cache_read_input_tokens + msgs[i - 1].usage.cache_creation_input_tokens - m.usage.cache_read_input_tokens : 0, usage: m.usage, kind: i === 0 ? "start" : u.block ? "block" : u.deny ? "denial" : "result", replyTok, userChars, exactTail, tailTok: replyTok + Math.ceil(userChars / 4) };
		}),
	});
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);
const f1 = (n: number) => n.toFixed(1);
const arms = ["base", "plugin"];

console.log("## (a) Write against new tail, turns after turn 0, by kind (tokens, chars/4)\n");
console.log("| arm | kind | turns | mean write | mean tail | mean write-tail | turns write > tail+1000 |");
console.log("|---|---|---|---|---|---|---|");
const breaks: string[] = [];
for (const arm of arms)
	for (const kind of ["result", "block", "denial"] as const) {
		const ts = sessions.filter((s) => s.arm === arm).flatMap((s) => s.turns.filter((t) => t.kind === kind));
		if (!ts.length) continue;
		const w = ts.map((t) => t.usage.cache_creation_input_tokens);
		const tl = ts.map((t) => t.tailTok);
		console.log(`| ${arm} | ${kind} | ${ts.length} | ${f1(mean(w))} | ${f1(mean(tl))} | ${f1(mean(w) - mean(tl))} | ${ts.filter((t) => t.usage.cache_creation_input_tokens > t.tailTok + 1000).length} |`);
	}
console.log("\n## Breaks: turn after turn 0 whose cache_read is more than 500 tokens below the previous request total (read + write), the prefix lost\n");
console.log("| arm | kind | turn | lost | write | read | tail |");
console.log("|---|---|---|---|---|---|---|---|");
for (const s of sessions)
	s.turns.forEach((t, i) => {
		if (i && t.lost > 500)
			console.log(`| ${s.arm} | ${t.kind} | ${i} | ${t.lost} | ${t.usage.cache_creation_input_tokens} | ${t.usage.cache_read_input_tokens} | ${t.tailTok} |`);
	});

console.log("\n## (b) First request, mean tokens\n");
console.log("| arm | rows | input | write | read | read share of (input+write+read) |");
console.log("|---|---|---|---|---|---|");
for (const arm of arms) {
	const t0 = sessions.filter((s) => s.arm === arm).map((s) => s.turns[0].usage);
	if (!t0.length) continue;
	const tot = t0.map((u) => u.input_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens);
	console.log(`| ${arm} | ${t0.length} | ${f1(mean(t0.map((u) => u.input_tokens)))} | ${f1(mean(t0.map((u) => u.cache_creation_input_tokens)))} | ${f1(mean(t0.map((u) => u.cache_read_input_tokens)))} | ${f1((100 * sum(t0.map((u) => u.cache_read_input_tokens))) / sum(tot))}% |`);
}
const hist = (arm: string) => {
	const m = new Map<number, number>();
	for (const s of sessions.filter((s) => s.arm === arm)) m.set(s.turns[0].usage.cache_read_input_tokens, (m.get(s.turns[0].usage.cache_read_input_tokens) ?? 0) + 1);
	return [...m].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}x${v}`).join(" ");
};
for (const arm of arms) console.log(`\nfirst-request cache_read values, ${arm}: ${hist(arm)}`);

console.log("\n## (c) Per-session cache-read share of input (read / (input + write + read))\n");
console.log("| arm | blocked | sessions | mean per-session share | pooled share | mean turns |");
console.log("|---|---|---|---|---|---|");
for (const arm of arms)
	for (const blocked of [false, true]) {
		const ss = sessions.filter((s) => s.arm === arm && s.blocked === blocked);
		if (!ss.length) continue;
		const per = ss.map((s) => {
			const u = s.turns.map((t) => t.usage);
			return sum(u.map((x) => x.cache_read_input_tokens)) / sum(u.map((x) => x.input_tokens + x.cache_creation_input_tokens + x.cache_read_input_tokens));
		});
		const all = ss.flatMap((s) => s.turns.map((t) => t.usage));
		const pooled = sum(all.map((x) => x.cache_read_input_tokens)) / sum(all.map((x) => x.input_tokens + x.cache_creation_input_tokens + x.cache_read_input_tokens));
		console.log(`| ${arm} | ${blocked} | ${ss.length} | ${f1(100 * mean(per))}% | ${f1(100 * pooled)}% | ${f1(mean(ss.map((s) => s.turns.length)))} |`);
	}
void breaks;

// Cost-weighted input (cache read 0.1, 1h write 2, 5m write 1.25, uncached input 1), in uncached-token units.
const cost = (u: Usage) => u.cache_read_input_tokens * 0.1 + (u.cache_creation?.ephemeral_1h_input_tokens ?? 0) * 2 + (u.cache_creation?.ephemeral_5m_input_tokens ?? 0) * 1.25 + u.input_tokens;
// Percentile bootstrap of the mean: 10000 resamples, seeded (mulberry32), no distribution assumed.
const rng = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const ci = (xs: number[]): string => {
	const r = rng(1);
	const ms = Array.from({ length: 10000 }, () => mean(xs.map(() => xs[Math.floor(r() * xs.length)]))).sort((a, b) => a - b);
	return `${f1(mean(xs))} [${f1(ms[249])}, ${f1(ms[9749])}]`;
};
console.log("\n## (e) Cost-weighted input per session, mean [95% bootstrap CI]\n");
console.log("| arm | sessions | turns | session cost | first-request cost | cost per turn (pooled) |");
console.log("|---|---|---|---|---|---|");
for (const arm of arms) {
	const ss = sessions.filter((s) => s.arm === arm);
	if (!ss.length) continue;
	const all = ss.flatMap((s) => s.turns.map((t) => cost(t.usage)));
	console.log(`| ${arm} | ${ss.length} | ${all.length} | ${ci(ss.map((s) => sum(s.turns.map((t) => cost(t.usage)))))} | ${ci(ss.map((s) => cost(s.turns[0].usage)))} | ${f1(mean(all))} |`);
}

console.log("\n## (f) First request of the second and later sessions: write against read\n");
for (const arm of arms) {
	const t0 = sessions.filter((s) => s.arm === arm).map((s) => s.turns[0].usage);
	console.log(`${arm}: write values ${[...new Set(t0.map((u) => u.cache_creation_input_tokens))].sort((a, b) => a - b).join(" ")}; read+write+input values ${[...new Set(t0.map((u) => u.input_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens))].sort((a, b) => a - b).join(" ")}`);
}

console.log("\n## (g) Exact tail (previous reply + new user text) of a block turn: the API's own growth in request total (turns with lost <= 500)\n");
console.log("| arm | block turns | mean write | mean exact tail | mean chars/4 tail | first 3 (write / exact / chars4) |");
console.log("|---|---|---|---|---|---|");
for (const arm of arms) {
	const bs = sessions.filter((s) => s.arm === arm).flatMap((s) => s.turns.filter((t) => t.kind === "block" && t.lost <= 500));
	if (!bs.length) continue;
	console.log(`| ${arm} | ${bs.length} | ${f1(mean(bs.map((t) => t.usage.cache_creation_input_tokens)))} | ${f1(mean(bs.map((t) => t.exactTail)))} | ${f1(mean(bs.map((t) => t.tailTok)))} | ${bs.slice(0, 3).map((t) => `${t.usage.cache_creation_input_tokens}/${t.exactTail}/${t.tailTok}`).join(", ")} |`);
}
