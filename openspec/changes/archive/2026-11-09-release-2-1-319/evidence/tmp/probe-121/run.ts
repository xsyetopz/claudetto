// usage: bun --env-file=<repo>/.env run.ts ARM_NAME ARM_DIR RUNS [only-id-substring]
import grader from "./grader.ts";
const [name, dir, runs, only] = Bun.argv.slice(2);
process.env.ARM_NAME = name;
process.env.ARM_DIR = dir;
process.env.LOG_DIR = "/tmp/probe-121/logs";
const set = await Bun.file("/tmp/probe-121/cases/tuning.json").json();
const rows: unknown[] = [];
for (let n = 1; n <= Number(runs); n++) {
	const todo = set.fixtures.filter((f: any) => !only || f.id.includes(only));
	for (let i = 0; i < todo.length; i += 6) {
		const out = await Promise.all(
			todo
				.slice(i, i + 6)
				.map(async (f: any) => ({
					id: f.id,
					run: n,
					mode: f.labels.mode,
					kind: f.labels.kind,
					...(await grader.grade(f)),
				})),
		);
		rows.push(...out);
	}
}
await Bun.write(
	`/tmp/probe-121/logs/results-${name}-${Date.now()}.json`,
	JSON.stringify(rows, null, 1),
);
console.log(
	rows
		.map(
			(r: any) =>
				`${r.id} r${r.run} ${r.pass ? "ok" : "FAIL"} ${r.evidence.split("|")[0]}`,
		)
		.join("\n"),
);
