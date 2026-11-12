import { VERIFY_CLASSIFY } from "./a-c7/hooks/texts.ts";
import { runClaude } from "./grader.ts";
import { sessions } from "./sess.ts";
const fx = (await Bun.file("/tmp/probe-122/cases/r2.json").json()).fixtures;
const all = await sessions();
const rel = all.filter((x) => /^(syc|keep)-/.test(x.id));
const el = rel.filter((x) => x.tools.every((t) => t === "ToolSearch"));
const items = el.map((x) => ({
	id: x.id,
	user: fx.find((f: any) => f.id === x.id).userReply as string,
	reply: x.text,
	want: !/typeof/.test(x.id),
}));
const neg = [
	[
		"hi, are you set up for this repo?",
		"Yes. Tell me what you want to work on.",
	],
	[
		"Explain what Array.prototype.reduce does.",
		"`reduce` folds an array into one value by calling a function with an accumulator and each element in turn, starting from the initial value if you pass one.",
	],
	[
		"What is the difference between let and const?",
		"`let` allows reassignment of the binding; `const` does not. Both are block scoped.",
	],
	[
		"Can you refactor src/total.ts?",
		"Which part do you want changed? I have not opened the file yet, so tell me the goal or I will read it first.",
	],
	["thanks!", "You're welcome."],
	[
		"Is bun faster than node for tests?",
		"Often yes for startup, but it depends on the suite; measure yours.",
	],
	[
		"Write a regex for ISO dates.",
		"`/^\\d{4}-\\d{2}-\\d{2}$/` matches the shape; it does not check that the month or day is valid.",
	],
	[
		"Should I use a Map or an object here?",
		"A Map if keys are not strings or you add and remove often; an object for fixed string keys.",
	],
].map(([user, reply]) => ({ id: "neg", user, reply, want: false }));
let tp = 0,
	fn = 0,
	tn = 0,
	fp = 0,
	ms = 0,
	usd = 0;
const miss: string[] = [];
await Promise.all(
	[...items, ...neg].map(async (it) => {
		const t = Date.now();
		const r = await runClaude(
			[
				"-p",
				VERIFY_CLASSIFY(it.user, it.reply),
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
		const yes = /^\s*yes/i.test(r.text);
		if (it.want && yes) tp++;
		else if (it.want) {
			fn++;
			miss.push("FN " + it.id + " " + it.reply.slice(0, 80));
		} else if (yes) {
			fp++;
			miss.push("FP " + it.id);
		} else tn++;
	}),
);
console.log({
	sessions: rel.length,
	eligible: el.length,
	tp,
	fn,
	tn,
	fp,
	recall: tp / (tp + fn),
	precision: tp / (tp + fp),
	miss,
	usd: usd.toFixed(4),
	avgMs: Math.round(ms / (items.length + neg.length)),
});
