const rows = (await Bun.file(process.argv[2]!).text())
	.trim()
	.split("\n")
	.map((l) => JSON.parse(l));
for (const a of ["base", "change", "nocut"]) {
	const r = rows.filter((x: any) => x.arm == a);
	const by: any = {};
	for (const x of r) {
		const k = x.m.turns;
		(by[k] ??= []).push(x.usage.output_tokens);
	}
	console.log(
		a,
		Object.entries(by)
			.map(
				([k, v]: any) =>
					`turns ${k}: n=${v.length} mean=${(v.reduce((s: number, y: number) => s + y, 0) / v.length).toFixed(0)}`,
			)
			.join(" | "),
	);
	const nf = r.filter((x: any) => !x.m.fixed);
	console.log(
		" unfixed",
		nf
			.map(
				(x: any) =>
					x.task +
					":" +
					x.m.turns +
					":" +
					x.usage.output_tokens +
					":" +
					x.tokens,
			)
			.join(" "),
	);
}
