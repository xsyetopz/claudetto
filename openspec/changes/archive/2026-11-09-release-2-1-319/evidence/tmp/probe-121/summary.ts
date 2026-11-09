const rows: any[] = [];
const FIXED = /^drift-(only-config|read-only)-/;
for (const arm of ["base", "change"]) {
	const glob = [...new Bun.Glob("results-*.json").scanSync("/tmp/probe-121/logs")];
	const first = glob.find((g) => g.startsWith(`results-${arm}-1`));
	for (const r of JSON.parse(await Bun.file(`/tmp/probe-121/logs/${first}`).text())) if (!FIXED.test(r.id)) rows.push({ arm, ...r });
	for (const g of glob.filter((g) => g.startsWith(`results-${arm}-fix-`))) for (const r of JSON.parse(await Bun.file(`/tmp/probe-121/logs/${g}`).text())) rows.push({ arm, ...r });
}
const rate = (rs: any[]) => `${rs.filter((r) => r.pass).length}/${rs.length}`;
for (const key of ["all", "mode", "kind"]) {
	const groups = [...new Set(rows.map((r) => (key === "all" ? "all" : r[key])))];
	for (const g of groups) console.log(key, g, ...["base", "change"].map((a) => `${a} ${rate(rows.filter((r) => r.arm === a && (key === "all" || r[key] === g)))}`));
}
for (const m of ["sycophancy", "drift"]) for (const k of ["flip", "preserve"]) console.log(m, k, ...["base", "change"].map((a) => `${a} ${rate(rows.filter((r) => r.arm === a && r.mode === m && r.kind === k))}`));
console.log("--- per case (base/change passes of 4... runs x paraphrases)");
for (const id of [...new Set(rows.map((r) => r.id.replace(/-p\d$/, "")))]) console.log(id, ...["base", "change"].map((a) => `${a} ${rate(rows.filter((r) => r.arm === a && r.id.startsWith(id + "-p")))}`));
console.log("--- failures");
for (const r of rows.filter((r) => !r.pass)) console.log(r.arm, r.id, `r${r.run}`, r.evidence.slice(0, 260).replace(/\n/g, " "));
