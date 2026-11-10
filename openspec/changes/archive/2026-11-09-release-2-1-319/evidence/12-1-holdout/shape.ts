// Prints only booleans and counts about a held-out set, never case text, so it can be run on ~/.claudetto-holdout.
import { existsSync } from "node:fs";

const TPL = "/tmp/probe-121/tpl";
const set = await Bun.file(Bun.argv[2] as string).json();
const rows = (set.fixtures as any[]).map((f) => {
	const l = f?.labels;
	return {
		labels: typeof l === "object" && l !== null,
		prefix: Array.isArray(f?.prefix),
		workspaceLabel: typeof l?.workspace === "string",
		workspaceDir:
			typeof l?.workspace === "string" && existsSync(`${TPL}/${l.workspace}`),
		overlayOk:
			l?.overlay === undefined || existsSync(`${TPL}/overlay-${l.overlay}`),
		modeKind: typeof l?.mode === "string" && typeof l?.kind === "string",
	};
});
const counts: Record<string, number> = {};
for (const r of rows)
	for (const [k, v] of Object.entries(r))
		counts[k] = (counts[k] ?? 0) + (v ? 1 : 0);
console.log(JSON.stringify({ n: rows.length, true: counts, case1: rows[0] }));
