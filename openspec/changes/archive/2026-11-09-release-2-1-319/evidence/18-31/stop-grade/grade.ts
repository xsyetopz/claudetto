// Grades cases.json with one grader-text arm the way limits/stop.ts gradeBlock does: haiku on the offered codes, and sonnet on
// credited, fallback and unseen when tool output exists, keeping its credited and unseen.
// Usage: bun --env-file=<repo>/.env grade.ts ARM_MODULE [cases.json] >> out.jsonl
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { offeredCodes } from "../../../../../../plugins/claudetto/hooks/limits/stop.ts";
import type { GradeFault } from "../../../../../../plugins/claudetto/hooks/texts.ts";
import { parseFaults } from "../../../../../../plugins/claudetto/hooks/verify.ts";

interface Case {
	id: string;
	people: string[];
	shown: string[];
	user: string;
	looked: boolean;
	asked: boolean;
	failed: string;
	results: string[];
	reply: string;
	want: GradeFault[];
}
const [mod, file = "cases.json"] = Bun.argv.slice(2);
const { VERIFY_GRADE } = await import(mod!);
const root = "/tmp/probe-1831-stopgrade";
mkdirSync(`${root}/cwd`, { recursive: true });
writeFileSync(`${root}/.created-by-claudetto`, "18.31 stop grade\n");
const env: Record<string, string> = {};
for (const [k, v] of Object.entries(process.env))
	if (
		v !== undefined &&
		!/^(ANTHROPIC_API_KEY|CLAUDECODE|AI_AGENT|CLAUDE_PID|CLAUDE_EFFORT|CLAUDE_AUTOCOMPACT_PCT_OVERRIDE|CLAUDE_CODE_(?!OAUTH_TOKEN))/.test(
			k,
		)
	)
		env[k] = v;
Object.assign(env, {
	CLAUDE_CONFIG_DIR: `${root}/cfg`,
	DISABLE_TELEMETRY: "1",
	DISABLE_ERROR_REPORTING: "1",
	DISABLE_AUTOUPDATER: "1",
});
let usd = 0;
const ask = async (model: string, prompt: string) => {
	const proc = Bun.spawn(
		[
			"claude",
			"-p",
			prompt,
			"--model",
			model,
			"--tools",
			"",
			"--setting-sources",
			"",
			"--disable-slash-commands",
			"--no-session-persistence",
			"--output-format",
			"json",
		],
		{
			cwd: `${root}/cwd`,
			env,
			stdin: "ignore",
			stdout: "pipe",
			stderr: "pipe",
		},
	);
	const text = await new Response(proc.stdout).text();
	await proc.exited;
	let j: { result?: string; total_cost_usd?: number } = {};
	try {
		j = JSON.parse(text);
	} catch {}
	usd += Number(j.total_cost_usd ?? 0);
	return String(j.result ?? "");
};
const cases = (
	JSON.parse(readFileSync(`${import.meta.dir}/${file}`, "utf8")) as {
		cases: Case[];
	}
).cases;
const run = async (c: Case) => {
	const codes = offeredCodes(c.looked, c.asked, c.failed !== "");
	const peers: GradeFault[] = ["credited", "fallback", "unseen"];
	const [h, s] = await Promise.all([
		ask(
			"haiku",
			VERIFY_GRADE(c.people, c.shown, c.user, c.reply, codes, [], [], c.failed),
		),
		c.results.length > 0
			? ask(
					"sonnet",
					VERIFY_GRADE(
						c.people,
						c.shown,
						c.user,
						c.reply,
						peers,
						c.results,
						[],
						c.failed,
					),
				)
			: "",
	]);
	const found = [
		...new Set([
			...parseFaults(h, codes, c.reply),
			...parseFaults(s, peers, c.reply).filter((x) => x !== "fallback"),
		]),
	];
	const gradeable = new Set<GradeFault>([
		...codes,
		...(c.results.length > 0 ? (["unseen"] as const) : []),
	]);
	const want = c.want.filter((x) => gradeable.has(x));
	return {
		id: c.id,
		want,
		found,
		missed: want.filter((x) => !found.includes(x)),
		extra: found.filter((x) => !want.includes(x)),
	};
};
let next = 0;
const rows: Awaited<ReturnType<typeof run>>[] = [];
await Promise.all(
	Array.from({ length: 6 }, async () => {
		for (let i = next++; i < cases.length; i = next++)
			rows.push(await run(cases[i]!));
	}),
);
for (const r of rows) console.log(JSON.stringify({ arm: mod, ...r }));
const pos = rows.reduce((n, r) => n + r.want.length, 0);
const miss = rows.reduce((n, r) => n + r.missed.length, 0);
const clean = rows.filter((r) => r.want.length === 0);
console.error(
	`${mod}: caught ${pos - miss}/${pos}, clean replies flagged ${clean.filter((r) => r.found.length > 0).length}/${clean.length}, extra flags ${rows.reduce((n, r) => n + r.extra.length, 0)}, exact ${rows.filter((r) => r.missed.length + r.extra.length === 0).length}/${rows.length}, usd ${usd.toFixed(3)}`,
);
