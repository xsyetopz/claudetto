// Each parity row's "2.1.319 test" cell names a colocated test title found in that file, or a recorded drop.
const ROOT = "/Users/krystian/CodeProjects/xsyetopz/claudetto";
const lines = (await Bun.file(`${ROOT}/openspec/changes/release-2-1-319/parity.md`).text()).split("\n");
const end = lines.findIndex((l) => l.startsWith("## Reconcile items"));
const rows = lines.slice(0, end).filter((l) => l.startsWith("| ") && !l.startsWith("| ---") && !l.startsWith("| Area"));
const tally = { test: 0, removed: 0, empty: 0, missingFile: 0, missingTitle: 0, other: 0 };
for (const row of rows) {
	const cell = row.split(" | ").at(-1)!.replace(/ \|$/, "").trim();
	if (cell === "") { tally.empty++; console.log("EMPTY", row.slice(0, 120)); continue; }
	if (/^(removed|dropped)/.test(cell)) { tally.removed++; continue; }
	const refs = [...cell.matchAll(/`(hooks\/[^`]+\.test\.tsx?)`: "([^"]+)"/g)];
	if (refs.length === 0) { tally.other++; console.log("OTHER", cell.slice(0, 160)); continue; }
	for (const [, file, title] of refs) {
		const f = Bun.file(`${ROOT}/plugins/claudetto/${file}`);
		if (!(await f.exists())) { tally.missingFile++; console.log("NOFILE", file); continue; }
		const src = await f.text();
		// Titles built with template literals hold ${...}; match on the literal parts.
		const parts = title.split(/\$\{[^}]*\}/).filter((p) => p.length > 0);
		if (parts.every((p) => src.includes(p))) tally.test++;
		else { tally.missingTitle++; console.log("NOTITLE", file, "|", title); }
	}
}
console.log(rows.length, "rows", JSON.stringify(tally));
