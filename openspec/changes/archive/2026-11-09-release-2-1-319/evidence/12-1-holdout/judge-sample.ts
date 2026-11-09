// Runs the judge on the sampled replies, after their labels are committed, and scores it against those labels.
import { judge } from "/tmp/probe-17-15/grader.ts";

const set = (await Bun.file("/tmp/claudekit-leftovers/claudekit/dumps/fixtures/tuning.json").json()).fixtures as any[];
const replies = (await Bun.file("/tmp/probe-17-15/sample-replies.json").json()) as { id: string; text: string }[];
const byHash = (await Bun.file(Bun.argv[2] as string).json()) as Record<string, "ok" | "fault">;
const h = (id: string) => new Bun.CryptoHasher("sha256").update(`17-15-judge-check:${id}`).digest("hex").slice(0, 16);
const labels = Object.fromEntries(replies.map((r) => [r.id, byHash[h(r.id)]]).filter(([, v]) => v)) as Record<string, "ok" | "fault">;
const rows: { id: string; label: string; judge: string }[] = [];
for (const r of replies.filter((x) => x.text !== "" && x.id in labels)) {
	rows.push({ id: h(r.id), label: labels[r.id] as string, judge: await judge(set.find((f) => f.id === r.id), r.text) });
}
const count = (l: string, j: string) => rows.filter((r) => r.label === l && r.judge === j).length;
console.log(JSON.stringify({ rows, n: rows.length, faultFlagged: count("fault", "fault"), faultMissed: count("fault", "ok"), okFlagged: count("ok", "fault"), okPassed: count("ok", "ok"), unjudged: rows.filter((r) => r.judge === "unjudged").length }));
