// Lists the risk-register items the plan's Done check rejects, so that check is one command:
// - an item at Likelihood 3 or higher whose status is not settled;
// - a settled item with no `Verified:` line or Verified clause after its Status, because a status with no recorded check is one picked to pass (issue #52);
// - an item Moved Out for any reason other than a part plugins/ does not ship, because Out removes a live fault from
//   the count while it still occurs (issue #52);
// - an item whose text carries two different `Likelihood: N` values, because its level cannot be read.
// An item runs from its `- [ ] **RISK-N**` or `- [x] **RISK-N**` line to the next item. Its status is the text after its
// last `Status:`, inline ones included (a Status often follows `Owner: X.` on the same line). Settled statuses start
// with closed, accepted, mitigated, transferred or moved Out; an item with no Status is settled only when its title
// reads "Moved Out as OUT-N", and then its OUT entry in prd/README.md must give a not-shipped reason.
// Usage: bun tools/check-register.ts [register-dir] [out-file]   Exits 1 when any item is listed.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? "plans/rebuild/risk-register";
const outFile = process.argv[3] ?? join(dir, "..", "prd", "README.md");
const SETTLED = /^\s*(closed|accepted|mitigated|transferred|moved out)/i;
const MOVED_TITLE = /^\s*Moved Out as (OUT-\d+)/;
const NOT_SHIPPED =
	/^(?:(?:the item )?describes a part (?:that plugins\/ does not ship|of the 088a227c tree that the rebuild dropped)|the part is not in plugins\/|part not shipped|governs how the rebuild agent works|owner-order design guidance for plan authors)/;

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

/** The reason each OUT entry gives, from `- [x] **OUT-N** Out (<reason>; moved from ...)`. */
function outReasons(): Map<string, string> {
	const reasons = new Map<string, string>();
	let text = "";
	try {
		text = readFileSync(outFile, "utf8");
	} catch {
		return reasons;
	}
	for (const m of text.matchAll(/^- \[[ x]\] \*\*(OUT-\d+)\*\* Out \(([^;)]*)/gmu)) reasons.set(m[1]!, m[2]!.trim());
	return reasons;
}

const reasons = outReasons();
const all = readdirSync(dir)
	.filter((f) => f.endsWith(".md"))
	.flatMap(items);
const open: string[] = [];
const unverified: string[] = [];
const movedLive: string[] = [];
const ambiguous: string[] = [];
for (const it of all) {
	const levels = [...new Set([...it.text.matchAll(/Likelihood:\s*(\d)/g)].map((m) => m[1]))];
	if (levels.length > 1) ambiguous.push(`${it.id} (${it.file}): Likelihood ${levels.join(" and ")}`);
	const level = Number(levels[0] ?? 0);
	const statuses = it.text.split("Status:");
	const status = statuses.length > 1 ? statuses[statuses.length - 1]!.trim().split("\n")[0]! : null;
	const moved = it.title.match(MOVED_TITLE);
	if (status === null && moved) {
		const reason = reasons.get(moved[1]!) ?? "no OUT entry";
		if (!NOT_SHIPPED.test(reason)) movedLive.push(`${it.id} (${it.file}): ${moved[1]} ${reason}`);
		continue;
	}
	const settled = status !== null && SETTLED.test(status);
	if (level >= 3 && !settled) open.push(`${it.id} (${it.file}): Likelihood ${level}, Status ${status ?? "none"}`);
	const verified = /^\s*-?\s*Verified:/mu.test(it.text) || statuses[statuses.length - 1]!.includes("Verified:");
	if (settled && !verified) unverified.push(`${it.id} (${it.file}): ${status!.slice(0, 60)}`);
}
const report = (label: string, lines: string[]) => {
	console.log(`${label}: ${lines.length}`);
	for (const line of lines) console.log(`  ${line}`);
};
console.log(`items: ${all.length}`);
report("Likelihood 3 or higher and not closed, accepted, mitigated, transferred or Moved Out", open);
report("settled with no Verified line", unverified);
report("Moved Out for a reason other than a part plugins/ does not ship", movedLive);
report("two Likelihood values", ambiguous);
process.exit(open.length + unverified.length + movedLive.length + ambiguous.length > 0 ? 1 : 0);
