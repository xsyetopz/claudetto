const r = (await Bun.file("/tmp/probe-122/ledger.jsonl").text())
	.trim()
	.split("\n")
	.map((l) => JSON.parse(l));
const t = (f: (x: any) => boolean) => {
	const s = r.filter(f);
	return `${s.length} rows, ${s.reduce((q, x) => q + x.tokens, 0)} tok, $${s.reduce((q, x) => q + x.usd, 0).toFixed(3)}`;
};
console.log(
	"pilot",
	t((x) => x.arm === "pilot"),
);
console.log(
	"dbg",
	t((x) => x.arm === "dbg"),
);
for (const a of ["base", "change"]) {
	console.log(
		a,
		"main",
		t((x) => x.arm === a),
	);
	console.log(
		a,
		"regrade of 2 drift cases",
		t((x) => String(x.arm).startsWith(`${a}-fix`)),
	);
}
console.log(
	"all",
	t(() => true),
	"max row tokens",
	Math.max(...r.map((x) => x.tokens)),
);
