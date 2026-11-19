// Lists risk-register items at Likelihood 3 or higher that are not settled, so the plan's Done check is one command.
// An item runs from its `- [ ] **RISK-N**` or `- [x] **RISK-N**` line to the next item. Its status is the text after its
// last `Status:`, inline ones included (a Status often follows `Owner: X.` on the same line). Settled statuses start
// with closed, accepted, mitigated or moved Out; an item with no Status is settled only when its title reads
// "Moved Out as OUT-N". An item whose text carries two different `Likelihood: N` values is reported as ambiguous,
// because its level cannot be read.
// Usage: bun tools/check-register.ts [register-dir]   Exits 1 when any item is listed.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? "plans/rebuild/risk-register";
const SETTLED = /^\s*(closed|accepted|mitigated|moved out)/i;
const MOVED_TITLE = /^\s*Moved Out as OUT-\d+/;

type Item = { id: string; file: string; title: string; text: string };

function items(file: string): Item[] {
	const out: Item[] = [];
	let fence = false;
	for (const line of readFileSync(join(dir, file), "utf8").split("\n")) {
		if (line.startsWith("```")) fence = !fence;
		const head = fence ? null : line.match(/^- \[[ x]\] \*\*(RISK-\d+)\*\*(.*)$/);
		if (head) out.push({ id: head[1]!, file, title: head[2]!, text: line });
		else if (out.length > 0) out[out.length - 1]!.text += `\n${line}`;
	}
	return out;
}

const all = readdirSync(dir)
	.filter((f) => f.endsWith(".md"))
	.flatMap(items);
const open: string[] = [];
const ambiguous: string[] = [];
for (const it of all) {
	const levels = [...new Set([...it.text.matchAll(/Likelihood:\s*(\d)/g)].map((m) => m[1]))];
	if (levels.length > 1) ambiguous.push(`${it.id} (${it.file}): Likelihood ${levels.join(" and ")}`);
	const level = Number(levels[0] ?? 0);
	const statuses = it.text.split("Status:");
	const status = statuses.length > 1 ? statuses[statuses.length - 1]!.trim().split("\n")[0]! : null;
	const settled = status === null ? MOVED_TITLE.test(it.title) : SETTLED.test(status);
	if (level >= 3 && !settled) open.push(`${it.id} (${it.file}): Likelihood ${level}, Status ${status ?? "none"}`);
}
console.log(`items: ${all.length}`);
console.log(`Likelihood 3 or higher and not closed, accepted, mitigated or Moved Out: ${open.length}`);
for (const line of open) console.log(`  ${line}`);
console.log(`two Likelihood values: ${ambiguous.length}`);
for (const line of ambiguous) console.log(`  ${line}`);
process.exit(open.length + ambiguous.length > 0 ? 1 : 0);
