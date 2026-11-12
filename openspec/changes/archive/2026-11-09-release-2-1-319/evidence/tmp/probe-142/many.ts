const prompts = [
	"In one sentence, what does a Promise do in JavaScript?",
	"Name three HTTP status codes for client errors, one line.",
	"Read sum.ts and tell me what total() returns for [1,2,3].",
	"Read sum.ts and say if total() has a bug.",
	"Explain what git rebase does in two sentences.",
	"What does the sum.ts file export? Look at it first.",
	"Give a one-line definition of idempotent.",
	"Read sum.ts and describe it in one sentence.",
	"What is the difference between let and const? One sentence.",
	"Check sum.ts and tell me its line count.",
];
const out = await Promise.all(
	prompts.map(async (p, i) => {
		const q = Bun.spawn(
			[
				"bun",
				"--env-file=/Users/krystian/CodeProjects/xsyetopz/claudetto/.env",
				"live.ts",
				`norm${i}`,
				p,
				"--allowedTools",
				"Read",
			],
			{ cwd: "/tmp/probe-142", stdout: "pipe", stderr: "pipe" },
		);
		const t = await new Response(q.stdout).text();
		await q.exited;
		try {
			return JSON.parse(t);
		} catch {
			return { name: `norm${i}`, err: t.slice(0, 200) };
		}
	}),
);
console.log(
	JSON.stringify(
		out.map((o: any) => ({
			n: o.name,
			usd: o.usd,
			tokens: o.tokens,
			ms: o.ms,
			err: o.err,
		})),
		null,
		0,
	),
);
