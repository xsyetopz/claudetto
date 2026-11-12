import { join } from "node:path";

import {
	bootstrapMean,
	cli,
	fisher,
	mannWhitneyP,
	permutationP,
	readOf,
	type Row,
	type Study,
	type Task,
	wilson,
} from "../18-5/harness.ts";

const FUNCTIONS = 40;
const PAD = "x".repeat(90);

const project = (noise: number, bug: number): Record<string, string> => ({
	"package.json": '{"name":"app","version":"1.0.0"}\n',
	"src/lib.ts": `${Array.from({ length: FUNCTIONS }, (_, i) => `export const f${i} = (x: number): number => x + ${i}${i === bug ? " + 1" : ""};`).join("\n")}\n`,
	"src/lib.test.ts": `import { expect, test } from "bun:test";\nimport * as lib from "./lib.ts";\n${Array.from({ length: FUNCTIONS }, (_, i) => `test("f${i}", () => {\n\tfor (let k = 0; k < ${noise}; k++) console.log(\`[f${i}] case \${k} ${PAD}\`);\n\texpect(lib.f${i}(1)).toBe(${i + 1});\n});`).join("\n")}\n`,
});

const task = (noise: number, bug: number): Task => ({
	name: `noise${noise}-bug${bug}`,
	files: project(noise, bug),
	prompt:
		"One test in this repo fails. Run `bun test`, find the cause, and fix it in src/lib.ts so that all of them pass. Reply with one sentence naming the function you fixed.",
	dry: () => ({ name: "Bash", input: { command: "bun test" } }),
});

const tasks = [
	task(3, 5),
	task(3, 33),
	task(8, 5),
	task(8, 33),
	task(14, 5),
	task(14, 33),
];

const study: Study = {
	probe: process.env.PROBE_NAME ?? "probe-18-6",
	root: process.env.PROBE_ROOT ?? "/tmp/probe-18-6",
	arms: [
		{ name: "base", plugin: false },
		{ name: "change", plugin: true },
		{ name: "nocut", plugin: true, options: { maxTestOutputChars: 0 } },
	].filter(
		(a) =>
			!process.env.PROBE_ARMS ||
			process.env.PROBE_ARMS.split(",").includes(a.name),
	),
	tasks,
	score: (reply, cwd, stdout) => {
		return {
			fixed: /x \+ \d+ \+ 1;/.test(readOf(join(cwd, "src/lib.ts"))) ? 0 : 1,
			cuts: reply.toolResults.filter((r) =>
				JSON.stringify(r.content).includes("[claudetto: cut"),
			).length,
			turns: reply.turns,
			shapeErrors:
				(stdout.match(/does not match its output shape/g) ?? []).length > 0
					? 1
					: 0,
			stopBlocks: (stdout.match(/Stop hook feedback/g) ?? []).length,
		};
	},
};

const median = (x: number[]): number =>
	[...x].sort((a, b) => a - b)[Math.floor(x.length / 2)] as number;

const outputs = (rows: Row[], arm: string): number[] =>
	rows.filter((r) => r.arm === arm).map((r) => r.usage.output_tokens);

const pair = (rows: Row[], a: string, b: string): string => {
	const x = outputs(rows, a);
	const y = outputs(rows, b);
	return `${a} vs ${b}: output tokens, Mann-Whitney p=${mannWhitneyP(x, y).toFixed(4)}, permutation test of the mean p=${permutationP(x, y).toFixed(4)}`;
};

const report = (rows: Row[], arms: string[]): string[] => {
	const out: string[] = [];
	for (const a of arms) {
		const r = rows.filter((x) => x.arm === a);
		const o = outputs(rows, a);
		const [lo, hi] = bootstrapMean(o);
		const fixed = r.filter((x) => x.m.fixed === 1).length;
		const [wl, wh] = wilson(fixed, r.length);
		const sum = (f: (x: Row) => number): number =>
			r.reduce((s, x) => s + f(x), 0);
		out.push(
			`${a}\tsessions ${r.length}\toutput tokens total ${o.reduce((s, v) => s + v, 0)} mean ${(o.reduce((s, v) => s + v, 0) / o.length).toFixed(1)} (bootstrap 95% ${lo.toFixed(1)}-${hi.toFixed(1)}) median ${median(o)}\tinput+cache tokens ${sum((x) => x.tokens - x.usage.output_tokens)}\tfixed ${fixed}/${r.length} Wilson ${wl.toFixed(3)}-${wh.toFixed(3)}\tcut markers ${sum((x) => x.m.cuts as number)}\ttokens ${sum((x) => x.tokens)}\t$${sum((x) => x.usd).toFixed(4)}\tlargest ${Math.max(0, ...r.map((x) => x.tokens))}\tcapped ${r.filter((x) => x.capped).length}`,
		);
	}
	out.push(pair(rows, "base", "change"), pair(rows, "nocut", "change"));
	const [b, c] = [
		rows.filter((x) => x.arm === "base"),
		rows.filter((x) => x.arm === "change"),
	];
	const k = (rs: Row[]): number => rs.filter((x) => x.m.fixed === 1).length;
	out.push(
		`fixed, Fisher two-sided base vs change: p=${fisher(k(b), b.length, k(c), c.length).toFixed(4)}`,
	);
	return out;
};

await cli(study, report);
