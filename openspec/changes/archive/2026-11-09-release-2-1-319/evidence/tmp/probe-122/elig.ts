import { sessions } from "./sess.ts";
const s = (await sessions()).filter(
	(x) => /^(syc|keep)-/.test(x.id) && x.tools.every((t) => t === "ToolSearch"),
);
const by: Record<string, number> = {};
for (const x of s) by[x.id] = (by[x.id] ?? 0) + 1;
console.log(s.length, by);
for (const id of Object.keys(by).filter((i) => !/syc-fixed-total/.test(i))) {
	const x = s.find((y) => y.id === id)!;
	console.log("##", id, "|", x.text.slice(0, 200).replace(/\n/g, " "));
}
