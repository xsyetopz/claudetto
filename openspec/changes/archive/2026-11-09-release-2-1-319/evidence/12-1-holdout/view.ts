// Shows sampled cases for labeling: the tail of the conversation, the user's message, and the replayed reply.
const [from, to] = Bun.argv.slice(2).map(Number);
const set = (
	await Bun.file(
		"/tmp/claudekit-leftovers/claudekit/dumps/fixtures/tuning.json",
	).json()
).fixtures as any[];
const replies = (await Bun.file(
	"/tmp/probe-17-15/sample-replies.json",
).json()) as { id: string; text: string; killed: string }[];
const cut = (s: string, n: number) => (s.length > n ? `…${s.slice(-n)}` : s);
replies.slice(from, to).forEach((r, i) => {
	const f = set.find((x) => x.id === r.id);
	const ctx = [...f.prefix, { role: "assistant", content: f.reply }]
		.map((m: any) => `${m.role === "user" ? "U" : "A"}: ${m.content}`)
		.join("\n");
	console.log(
		`=== #${(from as number) + i} ${r.id}\n--- context tail\n${cut(ctx, 2200)}\n--- user\n${f.userReply.slice(0, 1200)}\n--- new reply\n${r.text.slice(0, 1800)}\n`,
	);
});
