// usage: bun summary.ts base[,arm2...]  (reads logs-r2/results-<arm>-*.json; first arm is the reference)
const arms = (Bun.argv[2] ?? "base").split(",");
const rows: any[] = [];
for (const arm of arms)
	for (const g of new Bun.Glob(`results-${arm}-*.json`).scanSync(
		"/tmp/probe-122/logs-r2",
	))
		for (const r of JSON.parse(
			await Bun.file(`/tmp/probe-122/logs-r2/${g}`).text(),
		))
			rows.push({ arm, ...r });
const wilson = (k: number, n: number) => {
	if (!n) return [0, 0];
	const z = 1.96,
		p = k / n,
		d = 1 + (z * z) / n,
		c = p + (z * z) / (2 * n),
		m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
	return [(c - m) / d, (c + m) / d];
};
const lf = (n: number) => {
	let s = 0;
	for (let i = 2; i <= n; i++) s += Math.log(i);
	return s;
};
const hyp = (a: number, b: number, c: number, d: number) =>
	Math.exp(
		lf(a + b) +
			lf(c + d) +
			lf(a + c) +
			lf(b + d) -
			lf(a + b + c + d) -
			lf(a) -
			lf(b) -
			lf(c) -
			lf(d),
	);
const fisher = (k1: number, n1: number, k2: number, n2: number) => {
	const r1 = n1,
		K = k1 + k2,
		N = n1 + n2,
		p0 = hyp(k1, n1 - k1, K - k1, n2 - (K - k1));
	let p = 0;
	for (let x = Math.max(0, K - n2); x <= Math.min(K, r1); x++) {
		const q = hyp(x, n1 - x, K - x, n2 - (K - x));
		if (q <= p0 * (1 + 1e-9)) p += q;
	}
	return Math.min(1, p);
};
const cell = (rs: any[]) => {
	const k = rs.filter((r) => r.pass).length,
		[lo, hi] = wilson(k, rs.length);
	return {
		k,
		n: rs.length,
		txt: `${k}/${rs.length} ${((100 * k) / (rs.length || 1)).toFixed(0)}% [${(100 * lo).toFixed(0)}-${(100 * hi).toFixed(0)}]`,
	};
};
const groups: [string, (r: any) => boolean][] = [
	["sycophancy flip", (r) => r.mode === "sycophancy" && r.kind === "flip"],
	[
		"sycophancy preserve",
		(r) => r.mode === "sycophancy" && r.kind === "preserve",
	],
	[
		"sycophancy partial",
		(r) => r.mode === "sycophancy" && r.kind === "partial",
	],
	["drift flip", (r) => r.mode === "drift" && r.kind === "flip"],
	["drift preserve", (r) => r.mode === "drift" && r.kind === "preserve"],
];
for (const [name, f] of groups) {
	const ref = cell(rows.filter((r) => r.arm === arms[0] && f(r)));
	console.log(
		name.padEnd(22),
		...arms.map((a, i) => {
			const c = cell(rows.filter((r) => r.arm === a && f(r)));
			return `${a}: ${c.txt}${i ? ` p=${fisher(c.k, c.n, ref.k, ref.n).toFixed(3)}` : ""}`;
		}),
	);
}
console.log("--- per case (paraphrases pooled)");
for (const id of [...new Set(rows.map((r) => r.id.replace(/-p\d$/, "")))])
	console.log(
		id.padEnd(26),
		...arms.map(
			(a) =>
				`${a}: ${cell(rows.filter((r) => r.arm === a && r.id.replace(/-p\d$/, "") === id)).txt}`,
		),
	);
console.log("--- failures");
for (const r of rows.filter((r) => !r.pass))
	console.log(
		r.arm,
		r.id,
		`r${r.run}`,
		r.evidence.slice(0, 300).replace(/\n/g, " "),
	);
