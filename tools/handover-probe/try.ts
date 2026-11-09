import { ARMS } from "./arms.ts";
import { eventsOf } from "./events.ts";
import { runArm } from "./run.ts";

const arm = ARMS.find((a) => a.name === process.argv[2]);
if (arm === undefined) {
	throw new Error("arm?");
}
const r = await runArm(arm, 0);
console.log(r.dir, r.hosts, r.outside);
for (const rec of r.records.filter((x) => x.kind !== "other")) {
	console.log(rec.n, r.turnOf.get(rec.n), rec.kind, rec.calledHandoff, rec.contextTokens, rec.toolNames.length, rec.lastUserText.slice(0, 50));
}
console.log(eventsOf(r.records));
