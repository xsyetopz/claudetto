// Usage: bun --env-file=.env run3.ts PROMPT_MODULE cases.jsonl — samples Haiku on PIN_EXTRACT per row and counts kind|rules hits.
const [mod, cases] = Bun.argv.slice(2);
const { PIN_EXTRACT } = await import(mod);
const rows = (await Bun.file(cases).text())
	.trim()
	.split("\n")
	.map((l) => JSON.parse(l));
const one = async (p: string) => {
	const c = Bun.spawn(
		[
			"claude",
			"-p",
			p,
			"--model",
			"haiku",
			"--tools",
			"",
			"--setting-sources",
			"",
			"--no-session-persistence",
		],
		{ stdout: "pipe", env: { ...process.env, CLAUDECODE: "" } },
	);
	const t = await new Response(c.stdout).text();
	try {
		const j = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
		return `${j.kind}|${j.constraints
			.map((x: any) => x.rule)
			.filter((r: string) => r !== "none")
			.sort()
			.join(",")}`;
	} catch {
		return "?";
	}
};
let ok = 0,
	n = 0;
for (const r of rows) {
	const got = await Promise.all(
		Array.from({ length: r.n }, () => one(PIN_EXTRACT(r.c[0], [], r.c[1]))),
	);
	const want = r.want.includes("|") ? r.want : null;
	const hit = got.filter((g) =>
		want ? g === want : g.split("|")[0] === r.want,
	).length;
	ok += hit;
	n += r.n;
	const counts: Record<string, number> = {};
	for (const g of got) counts[g] = (counts[g] ?? 0) + 1;
	console.log(
		`${String(hit).padStart(2)}/${r.n} ${r.want.padEnd(17)} ${JSON.stringify(counts)}  ${r.c[1].slice(0, 50)}`,
	);
}
console.log(
	`TOTAL ${ok}/${n}  chars(static)=${PIN_EXTRACT([], [], "").length}`,
);
