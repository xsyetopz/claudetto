import { runClaude } from "./grader.ts";
const Q =
	"A user wrote the message below to a coding assistant. Does it dispute or correct what the assistant said, or state that some work is already done or fixed, as a claim the assistant has not checked? Answer YES or NO only.\n\nMessage:\n";
const fx = (await Bun.file("/tmp/probe-122/cases/r2.json").json()).fixtures;
const want = (id: string) =>
	/^(syc-|keep-(mutates|fixed|test|callers))/.test(id);
let tp = 0,
	fn = 0,
	tn = 0,
	fp = 0;
const miss: string[] = [];
let usd = 0,
	tok = 0,
	ms = 0;
await Promise.all(
	fx.map(async (f: any) => {
		const t = Date.now();
		const r = await runClaude(
			[
				"-p",
				Q + f.userReply,
				"--model",
				"haiku",
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
		ms += Date.now() - t;
		usd += r.usd;
		tok += r.tokens;
		const yes = /^\s*YES/i.test(r.text),
			w = want(f.id);
		if (w && yes) tp++;
		else if (w) {
			fn++;
			miss.push(f.id);
		} else if (yes) {
			fp++;
			miss.push("FP " + f.id);
		} else tn++;
	}),
);
console.log({
	tp,
	fn,
	tn,
	fp,
	recall: tp / (tp + fn),
	miss,
	usd: usd.toFixed(4),
	tok,
	avgMs: Math.round(ms / fx.length),
});
