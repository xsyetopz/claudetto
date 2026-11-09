// Text-mutant runner for lab-tested modules (ISSUES-2026-11-04-0934.md, "Mutation testing runs under Bun"):
// Stryker's switched mutants never turn on under `claude plugin test`, so each mutant is written into a private copy as plain text.
// Usage: bun mutate.ts <mutation.json> <worker name> <tests regex> <file>... | --full <survivors.jsonl> <worker name> [tests regex]
import { appendFile, cp, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const REPO = "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto";
const OUT = "/tmp/probe-76";
const TIMEOUT_MS = 90_000;

type Pos = { line: number; column: number };
type Mutant = { id: string; mutatorName: string; replacement: string; location: { start: Pos; end: Pos } };
type Job = { file: string; mutant: Mutant };

const offset = (text: string, p: Pos): number => {
	let at = 0;
	for (let line = 1; line < p.line; line++) at = text.indexOf("\n", at) + 1;
	return at + p.column - 1;
};

const walk = async (dir: string): Promise<string[]> =>
	(await readdir(dir, { withFileTypes: true, recursive: true }))
		.filter((d) => d.isFile() && d.name.endsWith(".test.ts"))
		.map((d) => join(d.parentPath, d.name));

const lab = async (dir: string): Promise<"pass" | "fail" | "timeout"> => {
	const child = Bun.spawn(["claude", "plugin", "test", dir], { stdout: "ignore", stderr: "ignore" });
	const timer = setTimeout(() => child.kill(), TIMEOUT_MS);
	const code = await child.exited;
	clearTimeout(timer);
	return child.signalCode ? "timeout" : code === 0 ? "pass" : "fail";
};

const run = async (worker: string, tests: RegExp | undefined, jobs: Job[]) => {
	const copy = join(process.env.TMPDIR ?? "/tmp", "stryk-04", worker);
	await rm(copy, { recursive: true, force: true });
	await cp(REPO, copy, { recursive: true });
	if (tests) {
		for (const f of await walk(join(copy, "hooks"))) {
			if (!tests.test(f.slice(copy.length + 1))) await rm(f);
		}
	}
	const kept = (await walk(join(copy, "hooks"))).length;
	const clean = await lab(copy);
	console.log(`${worker}: ${kept} test files, unmutated lab ${clean}, ${jobs.length} mutants`);
	if (clean !== "pass") throw new Error(`${worker}: the unmutated lab must pass`);
	const log = `${OUT}/${worker}.jsonl`;
	for (const { file, mutant } of jobs) {
		const path = join(copy, file);
		const source = await Bun.file(path).text();
		const start = offset(source, mutant.location.start);
		const end = offset(source, mutant.location.end);
		await Bun.write(path, source.slice(0, start) + mutant.replacement + source.slice(end));
		const t = performance.now();
		const result = await lab(copy);
		await Bun.write(path, source);
		const status = result === "fail" ? "killed" : result === "timeout" ? "timeout" : "survived";
		await appendFile(log, `${JSON.stringify({ file, id: mutant.id, mutator: mutant.mutatorName, line: mutant.location.start.line, original: source.slice(start, end), replacement: mutant.replacement, status, ms: Math.round(performance.now() - t) })}\n`);
	}
	console.log(`${worker}: done`);
};

const args = process.argv.slice(2);
if (args[0] === "--full") {
	const [, survivors, worker, tests] = args;
	const jobs = (await Bun.file(survivors!).text()).trim().split("\n").map((l) => JSON.parse(l) as Job);
	await run(worker!, tests ? new RegExp(tests) : undefined, jobs);
} else {
	const [report, worker, tests, ...files] = args;
	const r = await Bun.file(report!).json();
	const jobs: Job[] = files.flatMap((file) => (r.files[file].mutants as Mutant[]).map((mutant) => ({ file, mutant })));
	await run(worker!, new RegExp(tests!), jobs);
}
