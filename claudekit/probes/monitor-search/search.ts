import { toolSizes } from "../../src/capture/capture.ts";
import type { SyncGrader, Verdict } from "../../src/grade/grade.ts";

export const WRAPPER = "mcp__claudetto__monitor";

export interface Measure {
	// Tools the request after the search sends in `tools` that the request before it did not, with their bytes.
	loaded: { name: string; bytes: number }[];
	monitorUpFront: boolean;
}

export const measure = (before: unknown, after: unknown): Measure => {
	const had = new Set(toolSizes(before).map((t) => t.name));
	return {
		loaded: toolSizes(after)
			.filter((t) => !had.has(t.name))
			.map(({ name, bytes }) => ({ name, bytes })),
		monitorUpFront: had.has("Monitor"),
	};
};

const tools = (...names: string[]) => ({ tools: names.map((name) => ({ name, input_schema: { type: "object" } })) });

export const wrapperOnly: SyncGrader<Measure> = {
	name: "the search loads the wrapper and not the stock Monitor",
	fixtures: {
		good: [measure(tools("Bash"), tools("Bash", WRAPPER))],
		bad: [
			measure(tools("Bash"), tools("Bash", "Monitor")),
			measure(tools("Bash"), tools("Bash", "Monitor", WRAPPER)),
			measure(tools("Bash"), tools("Bash")),
			measure(tools("Bash", "Monitor"), tools("Bash", "Monitor", WRAPPER)),
		],
	},
	grade: (m): Verdict => {
		const names = m.loaded.map((t) => t.name);
		const pass = !m.monitorUpFront && names.length === 1 && names[0] === WRAPPER;
		return { pass, label: names.join(",") || "none", evidence: JSON.stringify(m) };
	},
};
