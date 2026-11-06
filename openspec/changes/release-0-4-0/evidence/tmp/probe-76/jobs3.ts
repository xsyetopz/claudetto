// bun jobs3.ts <worker> <report>: like jobs2.ts for any Stryker report.
const [worker, report] = process.argv.slice(2);
const r = await Bun.file(report!).json();
const rows = (await Bun.file(`/tmp/probe-76/${worker}.jsonl`).text()).trim().split("\n").map((l) => JSON.parse(l));
const jobs = rows.filter((x) => x.status === "survived" && x.file.endsWith("denials.ts")).map((x) => ({ file: x.file, mutant: r.files[x.file].mutants.find((m: { id: string }) => m.id === x.id) }));
await Bun.write(`/tmp/probe-76/${worker}-survivors.jsonl`, jobs.map((j) => JSON.stringify(j)).join("\n") + "\n");
console.log(worker, jobs.length);
