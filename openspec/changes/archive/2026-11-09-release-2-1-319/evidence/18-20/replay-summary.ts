// Per round: of the graded rows (asked == 0), the failing ones the `asks` code flagged and the in-form ones it flagged. Usage: bun replay-summary.ts <replay.jsonl>... [--all]
interface Out {
	round: string;
	case: string;
	kind: string;
	formP: boolean;
	found: string[];
	raw: string;
}
const files = Bun.argv.slice(2);
const rows = (await Promise.all(files.map((f) => Bun.file(f).text()))).flatMap(
	(t) =>
		t
			.split("\n")
			.filter(Boolean)
			.map((l) => JSON.parse(l) as Out),
);
for (const round of [...new Set(rows.map((r) => r.round))].sort()) {
	const mine = rows.filter((r) => r.round === round);
	const failing = mine.filter((r) => !r.formP);
	const inForm = mine.filter((r) => r.formP);
	const hit = (r: Out) => r.found.includes("asks");
	console.log(
		`round ${round}: graded ${mine.length}; failing ${failing.length}, flagged ${failing.filter(hit).length}; in form ${inForm.length}, flagged ${inForm.filter(hit).length}; other codes ${
			mine
				.filter((r) => r.found.some((c) => c !== "asks"))
				.map((r) => `${r.case}:${r.found.filter((c) => c !== "asks")}`)
				.join(",") || "none"
		}`,
	);
	for (const r of inForm.filter(hit))
		console.log(
			`  IN-FORM FLAGGED ${r.case} (${r.kind}): ${r.raw.replace(/\s+/g, " ").slice(0, 300)}`,
		);
	for (const r of failing.filter((x) => !hit(x)))
		console.log(`  missed ${r.case} (${r.kind})`);
}
