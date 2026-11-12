// bun jobs.ts <worker>: writes <worker>-survivors.jsonl, the survived mutants as --full jobs from the Stryker report.
const [worker] = process.argv.slice(2);
const r = await Bun.file(
	`${process.env.TMPDIR}stryk-04/claudetto/reports/mutation/mutation.json`,
).json();
const rows = (await Bun.file(`/tmp/probe-76/${worker}.jsonl`).text())
	.trim()
	.split("\n")
	.map((l) => JSON.parse(l));
const jobs = rows
	.filter((x) => x.status === "survived")
	.map((x) => ({
		file: x.file,
		mutant: r.files[x.file].mutants.find((m: { id: string }) => m.id === x.id),
	}));
await Bun.write(
	`/tmp/probe-76/${worker}-survivors.jsonl`,
	jobs.map((j) => JSON.stringify(j)).join("\n") + "\n",
);
console.log(
	worker,
	jobs.length,
	jobs.filter((j) => !j.mutant).length,
	"missing",
);
