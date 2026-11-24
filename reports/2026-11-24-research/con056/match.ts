// For each local eval run and case, names the case commit the run used. It compares the prompt and
// graders the run recorded with the case at the last commit before the run ("committed") and, when
// those differ or no commit exists yet, with the first commit after it ("uncommitted": the run used a
// working tree the next commit holds). `scaffold.sh` is not in the result, so it is not compared.
// Usage: bun match.ts <plugin>. Output: <dir> <start> <model> <case> <commit> <when> same|DIFF <parts>.
import { $ } from "bun";

const plugin = Bun.argv[2] ?? "claudetto";
const base = `plugins/${plugin}/evals`;
type Grader = {
	name: string;
	type: string;
	weight?: number;
	config?: Record<string, unknown>;
};
type Case = { name: string; promptMarkdown: string; graders: Grader[] };
type Run = {
	startedAt: string;
	suite: { modelOverride?: string };
	cases: Case[];
};

const show = async (rev: string, path: string) =>
	(await $`git show ${rev}:${path}`.quiet().nothrow()).text();
const log = async (args: string[], dir: string) =>
	(await $`git log ${args} --format=%h -- ${dir}`.quiet().text())
		.trim()
		.split("\n")[0] ?? "";

function split(text: string): { head: Record<string, unknown>; body: string } {
	const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/u.exec(text);
	return m
		? {
				head: (Bun.YAML.parse(m[1] ?? "") ?? {}) as Record<string, unknown>,
				body: (m[2] ?? "").trim()
			}
		: { head: {}, body: "" };
}

/** The parts of the recorded case that differ from the case at `rev`. */
async function diffAt(rev: string, dir: string, c: Case): Promise<string[]> {
	const yaml = Bun.YAML.parse(await show(rev, `${dir}/case.yaml`)) as {
		execution?: { prompt?: string };
	};
	const diffs: string[] = [];
	if ((yaml.execution?.prompt ?? "").trim() !== c.promptMarkdown.trim())
		diffs.push("prompt");
	const files = (
		await $`git ls-tree --name-only ${rev} ${dir}/graders/`
			.quiet()
			.nothrow()
			.text()
	)
		.trim()
		.split("\n")
		.filter(Boolean);
	const committed = new Map<
		string,
		{ head: Record<string, unknown>; body: string }
	>();
	for (const f of files)
		committed.set(
			f.split("/").pop()?.replace(/\.md$/u, "") ?? "",
			split(await show(rev, f))
		);
	for (const g of c.graders) {
		const k = committed.get(g.name);
		if (!k) {
			diffs.push(`+${g.name}`);
			continue;
		}
		const pattern = g.config?.["pattern"];
		const criteria = g.config?.["criteria"];
		if (
			k.head["type"] !== g.type ||
			(k.head["weight"] ?? 1) !== (g.weight ?? 1) ||
			(pattern !== undefined && k.head["pattern"] !== pattern) ||
			(typeof criteria === "string" && k.body !== criteria.trim())
		) {
			diffs.push(`~${g.name}`);
		}
	}
	const ran = new Set(c.graders.map((g) => g.name));
	for (const n of committed.keys()) if (!ran.has(n)) diffs.push(`-${n}`);
	return diffs;
}

for await (const file of new Bun.Glob(
	`${base}/results/*/aggregate-result.json`
).scan()) {
	const run = (await Bun.file(file).json()) as Run;
	const head = `${file.split("/").at(-2)} ${run.startedAt.slice(0, 16)} ${run.suite.modelOverride ?? "-"}`;
	for (const c of run.cases) {
		const dir = `${base}/${c.name}`;
		const before = await log(["-1", `--before=${run.startedAt}`], dir);
		const after = await log(["--reverse", `--after=${run.startedAt}`], dir);
		const atBefore = before ? await diffAt(before, dir, c) : undefined;
		if (atBefore?.length === 0) {
			console.log(`${head} ${c.name} ${before} committed same`);
			continue;
		}
		const atAfter = after ? await diffAt(after, dir, c) : undefined;
		if (atAfter?.length === 0) {
			console.log(`${head} ${c.name} ${after} uncommitted same`);
			continue;
		}
		const rev = before || after || "none";
		const diffs = atBefore ?? atAfter ?? ["never-committed"];
		console.log(
			`${head} ${c.name} ${rev} ${before ? "committed" : "uncommitted"} DIFF ${diffs.join(",")}`
		);
	}
}
