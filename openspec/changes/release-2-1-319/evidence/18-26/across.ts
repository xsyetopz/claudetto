// 18.26 (b): byte-diff the first main request of two separate sessions (two folders, two session ids) on the fake API.
// Usage: bun across.ts <requests-dir-A> <requests-dir-B>. Prints where tools, system, and messages[0] first differ.
import { readFileSync } from "node:fs";
const first = (dir: string) => {
	const b = JSON.parse(readFileSync(`${dir}/0002.body.json`, "utf8"));
	return b;
};
const [a, b] = [first(process.argv[2] ?? ""), first(process.argv[3] ?? "")];
const drop = (v: unknown): unknown => (Array.isArray(v) ? v.map(drop) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== "cache_control").map(([k, x]) => [k, drop(x)])) : v);
const at = (x: string, y: string) => {
	let i = 0;
	while (i < x.length && i < y.length && x[i] === y[i]) i++;
	return i;
};
const parts: [string, unknown, unknown][] = [
	["tools", a.tools, b.tools],
	["system", a.system, b.system],
	["messages[0]", a.messages[0], b.messages[0]],
	["messages[1]", a.messages[1], b.messages[1]],
];
for (const [name, x, y] of parts) {
	const [s, t] = [JSON.stringify(drop(x)), JSON.stringify(drop(y))];
	const i = at(s, t);
	console.log(name, s === t ? "identical" : `differs at byte ${i} of ${s.length}: ${s.slice(Math.max(0, i - 50), i + 90)} || ${t.slice(Math.max(0, i - 50), i + 90)}`);
}
