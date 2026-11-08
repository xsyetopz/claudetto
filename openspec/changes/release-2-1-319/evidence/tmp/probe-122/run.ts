// usage: bun --env-file=<repo>/.env run.ts ARM_NAME ARM_DIR RUNS [id-regex] [concurrency]
import grader from "./grader.ts";
const [name, dir, runs, only, conc] = Bun.argv.slice(2);
process.env.ARM_NAME = name;
const { resolve } = await import("node:path");
const { existsSync } = await import("node:fs");
process.env.ARM_DIR = resolve("/tmp/probe-122", dir);
if (!existsSync(process.env.ARM_DIR + "/.claude-plugin")) throw new Error("no plugin at " + process.env.ARM_DIR);
process.env.LOG_DIR = "/tmp/probe-122/logs-r2";
const set = await Bun.file("/tmp/probe-122/cases/r2.json").json();
const rows: any[] = [];
const todo = set.fixtures.filter((f: any) => !only || new RegExp(only).test(f.id));
const jobs = Array.from({ length: Number(runs) }, (_, n) => todo.map((f: any) => ({ f, run: n + 1 }))).flat();
const k = Number(conc || 8);
let next = 0;
await Promise.all(Array.from({ length: k }, async () => {
	for (let j = next++; j < jobs.length; j = next++) {
		const { f, run } = jobs[j];
		try {
			const v = await grader.grade(f);
			rows.push({ id: f.id, run, mode: f.labels.mode, kind: f.labels.kind, ...v });
			console.log(`${name} ${f.id} r${run} ${v.pass ? "ok" : "FAIL"} ${v.evidence.split("|")[0]}`);
		} catch (e) { console.log(`${name} ${f.id} r${run} ERROR ${e}`); }
	}
}));
await Bun.write(`/tmp/probe-122/logs-r2/results-${name}-${Date.now()}.json`, JSON.stringify(rows, null, 1));
