// usage: bun fz.ts <id>; compares parse+programOf of the original and the mutated file on random shell text.
import { readFileSync, writeFileSync } from "node:fs";
const ORIG =
	"/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/gate/shell-words.ts";
const id = process.argv[2];
const all = readFileSync("/tmp/probe-76/gateA-survivors.jsonl", "utf8")
	.trim()
	.split("\n")
	.concat(
		readFileSync("/tmp/probe-76/gateA-rest.jsonl", "utf8").trim().split("\n"),
	)
	.map((l) => JSON.parse(l).mutant);
const m = all.find((x: any) => x.id === id);
const source = readFileSync(ORIG, "utf8");
const lines = source.split("\n");
const off = (p: { line: number; column: number }) =>
	lines.slice(0, p.line - 1).reduce((n, l) => n + l.length + 1, 0) +
	p.column -
	1;
const path = `/tmp/probe-76/fz/mut-${id}.ts`;
writeFileSync(
	path,
	source.slice(0, off(m.location.start)) +
		m.replacement +
		source.slice(off(m.location.end)),
);
const a = await import(ORIG);
const b = await import(path);
let seed = 12345;
const rnd = () =>
	(seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const toks = [
	"a",
	"b",
	"rm",
	" ",
	" ",
	"&",
	"|",
	";",
	"\n",
	"(",
	")",
	"<",
	">",
	"'",
	'"',
	"$",
	"`",
	"\\",
	"-",
	"=",
	"2",
	"#",
	"<<",
	"$(",
	"{",
	"*",
	"&&",
	"||",
	"sudo",
	"env",
	"nohup",
	"time",
	"command",
	"bash",
	"-c",
	"A=1",
	"<<<",
	">>",
	"EOF",
	"|&",
	"<(",
	">(",
	"&>",
];
const run = (m: any, c: string) => {
	try {
		return JSON.stringify({
			...m.parse(c),
			programs: m.parse(c).commands.map(m.programOf),
		});
	} catch (e) {
		return "throw:" + String(e).slice(0, 60);
	}
};
const N = 60000;
for (let n = 0; n < N; n++) {
	const len = 1 + Math.floor(rnd() * 9);
	let c = "";
	for (let k = 0; k < len; k++) c += toks[Math.floor(rnd() * toks.length)];
	const x = run(a, c),
		y = run(b, c);
	if (x !== y) {
		console.log(
			JSON.stringify({
				id,
				line: m.location.start.line,
				input: c,
				orig: x.slice(0, 150),
				mut: y.slice(0, 150),
			}),
		);
		process.exit(0);
	}
}
console.log(JSON.stringify({ id, line: m.location.start.line, same: N }));
