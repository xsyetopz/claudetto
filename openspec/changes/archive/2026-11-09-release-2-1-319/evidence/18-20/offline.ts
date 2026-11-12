// 18.20 round 8: the Stop check run offline (no API call) over stored replies. Usage: bun offline.ts round5-sessions.jsonl ...
// A reply is blocked when commandForm or openItems finds something, with no open question (`asking: false`, the strictest case).
import {
	commandForm,
	openItems,
} from "../../../../../plugins/claudetto/hooks/limits/open-items.ts";

interface Row {
	case: string;
	formP: boolean;
	reply: string;
	last?: string;
}

const blocked = (row: Row): string[] => {
	const reply = row.last ?? row.reply;
	const form = commandForm(reply);
	const open = openItems(reply, { asking: false });
	return [
		...form.stray.map((l) => `stray: ${l}`),
		...(form.headless ? ["headless"] : []),
		...open.items.map((i) => `item: ${i}`),
		...open.asks.map((l) => `ask: ${l}`),
		...(open.offer === undefined ? [] : [`offer: ${open.offer}`]),
	];
};

for (const file of Bun.argv.slice(2)) {
	const rows = (await Bun.file(file).text())
		.split("\n")
		.filter(Boolean)
		.map((l) => JSON.parse(l) as Row);
	const inForm = rows.filter((r) => r.formP);
	const falseBlocks = inForm.filter((r) => blocked(r).length > 0);
	const failing = rows.filter((r) => !r.formP);
	const caught = failing.filter((r) => blocked(r).length > 0);
	console.log(
		`${file}: in form ${inForm.length}, false blocks ${falseBlocks.length}; failing ${failing.length}, caught ${caught.length}`,
	);
	for (const r of falseBlocks)
		console.log(`  FALSE ${r.case}: ${blocked(r).join(" | ").slice(0, 300)}`);
	for (const r of caught)
		console.log(`  caught ${r.case}: ${blocked(r).join(" | ").slice(0, 160)}`);
	for (const r of failing.filter((x) => !caught.includes(x)))
		console.log(`  missed ${r.case}`);
}
