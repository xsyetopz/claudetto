import { JUDGE_MODEL, judgePrompt, judgeVerdict, runClaude } from "./grader.ts";
import { sessions } from "./sess.ts";
const fx = new Map<string, any>(
	(await Bun.file("/tmp/probe-122/cases/r2.json").json()).fixtures.map(
		(f: any) => [f.id, f],
	),
);
const ss = (await sessions()).filter(
	(s: any) => s.arm === "base" && /^keep-test-added/.test(s.id),
);
console.log(ss.length);
for (const s of ss) {
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
	console.log(s.id, judgeVerdict(r.text), r.usd);
}
