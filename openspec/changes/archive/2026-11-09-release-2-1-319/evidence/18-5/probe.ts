import { join } from "node:path";
import { cli, fisher, rng, sizeOf, wilson, type Row, type Study, type Task } from "./harness.ts";

const LARGE_BYTES = 20_000;

const lines = (n: number, make: (i: number, r: () => number) => string, seed: number): string => {
	const r = rng(seed);
	return `${Array.from({ length: n }, (_, i) => make(i, r)).join("\n")}\n`;
};

const lockfile = (): string => {
	const r = rng(1);
	const pkgs = Object.fromEntries(
		Array.from({ length: 600 }, (_, i) => [`node_modules/zq-pkg-${String(i).padStart(4, "0")}`, { version: `${1 + Math.floor(r() * 9)}.${Math.floor(r() * 20)}.${Math.floor(r() * 20)}`, resolved: `https://registry.example/zq-pkg-${i}.tgz`, integrity: `sha512-${Math.floor(r() * 1e15).toString(36)}` }]),
	);
	return JSON.stringify({ name: "app", lockfileVersion: 3, packages: pkgs }, null, 2);
};

const bunLock = (): string => lines(1500, (i, r) => `    "zq-lib-${String(i).padStart(4, "0")}": ["zq-lib-${i}@${1 + Math.floor(r() * 9)}.${Math.floor(r() * 20)}.${Math.floor(r() * 20)}", "", {}, "sha512-${Math.floor(r() * 1e15).toString(36)}"],`, 2);

const minified = (): string => lines(400, (i, r) => `function f${i}(a,b){return a*${Math.floor(r() * 99)}+b-${Math.floor(r() * 99)}}var v${i}=f${i}(${i},${Math.floor(r() * 9)});${i === 233 ? 'var RATE_LIMIT_MSG="slow down: 42 per minute";' : ""}`, 3);

const legacy = (): string => lines(3000, (i, r) => (i % 6 === 0 ? `function fn${i}(x) { return x + ${Math.floor(r() * 99)}; }` : i === 2401 ? `  if (x > 1e9) throw new Error("E_QUOTA_EXCEEDED");` : `// helper ${i} ${Math.floor(r() * 1e6)}`), 4);

const engine = (): string => lines(3500, (i, r) => (i % 7 === 0 ? `export const step${i} = (n: number): number => n * ${Math.floor(r() * 99)};` : i === 2900 ? `// the dead branch\nexport const probe${i} = (): string => "UNREACHABLE";` : `// note ${i} ${Math.floor(r() * 1e6)}`), 5);

const appLog = (): string => lines(6000, (i, r) => (i === 4321 ? "2026-11-05T10:00:00Z FATAL disk quota reached on volume vol-7" : `2026-11-05T10:00:00Z INFO req-${i} ok ${Math.floor(r() * 900)}ms`), 6);

const pkgJson = '{"name":"app","version":"1.0.0"}\n';

const task = (name: string, path: string, text: string, prompt: string): Task => ({
	name,
	files: { "package.json": pkgJson, [path]: text },
	prompt,
	dry: (cwd) => ({ name: "Read", input: { file_path: join(cwd, path) } }),
});

const tasks = [
	task("lock", "package-lock.json", lockfile(), "Which version of the package zq-pkg-0412 does package-lock.json pin? Answer with the version only."),
	task("bunlock", "bun.lock", bunLock(), "Which version of zq-lib-0777 does bun.lock pin? Answer with the version only."),
	task("minjs", "vendor/dash.min.js", minified(), "In vendor/dash.min.js, what string does the constant RATE_LIMIT_MSG hold? Answer with the string only."),
	task("nodemod", "node_modules/legacy-util/lib/index.js", legacy(), "Which line of node_modules/legacy-util/lib/index.js throws E_QUOTA_EXCEEDED? Answer with the line text only."),
	task("bigsrc", "src/engine.ts", engine(), "Which exported constant in src/engine.ts returns the string UNREACHABLE? Answer with its name only."),
	task("biglog", "logs/app.log", appLog(), "What is the message of the one FATAL line in logs/app.log? Answer with the message only."),
];

const HEAVY = new Set(["lock", "bunlock", "minjs", "nodemod"]);

const study: Study = {
	probe: "probe-18-5",
	root: "/tmp/probe-18-5",
	arms: [{ name: "base", plugin: false }, { name: "change", plugin: true }],
	tasks,
	score: (reply, cwd) => {
		const results = new Map(reply.toolResults.map((r) => [r.toolUseId, r.isError]));
		const reads = reply.toolCalls.flatMap((c) => {
			const i = c.input as { file_path?: string; offset?: number };
			return c.name === "Read" && i.offset === undefined && (i.file_path ?? "").startsWith(cwd) && sizeOf(i.file_path ?? "") >= LARGE_BYTES ? [c] : [];
		});
		return { attempts: reads.length, landed: reads.filter((c) => results.get(c.id) === false).length, reads: reply.toolCalls.filter((c) => c.name === "Read").length };
	},
};

const arm = (rows: Row[], name: string) => rows.filter((r) => r.arm === name);

const count = (rows: Row[], key: string): number => rows.filter((r) => (r.m[key] as number) > 0).length;

const line = (name: string, rows: Row[], key: string): string => {
	const [lo, hi] = wilson(count(rows, key), rows.length);
	return `${name}\t${key} ${count(rows, key)}/${rows.length}\tWilson ${lo.toFixed(3)}-${hi.toFixed(3)}\tcalls ${rows.reduce((s, r) => s + (r.m[key] as number), 0)}`;
};

const report = (rows: Row[]): string[] => {
	const out: string[] = [];
	for (const [label, keep] of [["all tasks", () => true], ["heavy-file tasks (lock, bunlock, minjs, nodemod)", (r: Row) => HEAVY.has(r.task)], ["control tasks (bigsrc, biglog)", (r: Row) => !HEAVY.has(r.task)]] as const) {
		const b = arm(rows, "base").filter(keep);
		const c = arm(rows, "change").filter(keep);
		out.push(`== ${label}`);
		for (const key of ["attempts", "landed"]) {
			out.push(line("base  ", b, key), line("change", c, key), `Fisher two-sided ${key}: p=${fisher(count(b, key), b.length, count(c, key), c.length).toFixed(4)}`);
		}
	}
	for (const a of ["base", "change"]) {
		const r = arm(rows, a);
		out.push(`${a}\tsessions ${r.length}\ttokens ${r.reduce((s, x) => s + x.tokens, 0)}\t$${r.reduce((s, x) => s + x.usd, 0).toFixed(4)}\tlargest ${Math.max(0, ...r.map((x) => x.tokens))}\tcapped ${r.filter((x) => x.capped).length}`);
	}
	return out;
};

await cli(study, report);
