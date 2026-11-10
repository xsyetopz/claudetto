import { JUDGE_MODEL, judgePrompt, judgeVerdict, runClaude } from "./grader.ts";
import { sessions } from "./sess.ts";
const set = (await Bun.file("/tmp/probe-122/cases/r2.json").json()).fixtures;
const fx = new Map<string, any>(set.map((f: any) => [f.id, f]));
// old verdicts from round-1 results
const old = new Map<string, boolean>();
for (const g of new Bun.Glob("results-*.json").scanSync(
	"/tmp/probe-122/logs",
)) {
	if (!/^results-(base|change)/.test(g)) continue;
	for (const r of JSON.parse(
		await Bun.file(`/tmp/probe-122/logs/${g}`).text(),
	)) {
		const reply = r.evidence.split(" | ").slice(2).join(" | ").slice(0, 120);
		old.set(
			`${g.includes("-fix-") ? "f" : ""}${reply}`,
			r.pass && !r.evidence.startsWith("judge"),
		);
		old.set(reply, !r.evidence.split("|")[0].includes("judge"));
	}
}
const ss = (await sessions()).filter(
	(s) =>
		/^(base|change)$/.test(s.arm) &&
		fx.get(s.id)?.labels.judge &&
		fx.get(s.id).labels.mode === "sycophancy",
);
const out: any[] = [];
let i = 0;
await Promise.all(
	Array.from({ length: 8 }, async () => {
		for (let j = i++; j < ss.length; j = i++) {
			const s = ss[j];
			const f = fx.get(s.id);
			const r = await runClaude(
				[
					"-p",
					judgePrompt(f.labels.judge, f.userReply, s.text, s.commands),
					"--model",
					JUDGE_MODEL,
					"--tools",
					"",
					"--setting-sources",
					"",
					"--disable-slash-commands",
					"--no-session-persistence",
					"--output-format",
					"stream-json",
					"--verbose",
				],
				"/tmp/probe-122",
			);
			out.push({
				file: s.file,
				arm: s.arm,
				id: s.id,
				newJudge: judgeVerdict(r.text),
				oldJudge: old.get(s.text.slice(0, 120)),
				reason: r.text.replace(/\n/g, " ").slice(0, 300),
				tokens: r.tokens,
				usd: r.usd,
			});
		}
	}),
);
await Bun.write("/tmp/probe-122/rejudge.json", JSON.stringify(out, null, 1));
console.log(
	out.length,
	"sessions; usd",
	out.reduce((a, r) => a + r.usd, 0).toFixed(4),
);
const tab: Record<string, number> = {};
for (const r of out)
	tab[`old=${r.oldJudge} new=${r.newJudge}`] =
		(tab[`old=${r.oldJudge} new=${r.newJudge}`] ?? 0) + 1;
console.log(tab);
