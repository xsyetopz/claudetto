import type { SyncGrader, Verdict } from "../../src/grade/grade.ts";
import { settled, settledBeforeFirstRequest, timeline } from "../../src/timing/timing.ts";

// The text the skills listing gives simplify; the recorded runs counted it with grep -c '- simplify'.
const LISTED = "- simplify:";
const EVENT = "settings.read";

export interface Measure {
	settledMs: number | undefined;
	settledFirst: boolean | undefined;
	listed: boolean;
}

export const measure = (debugLog: string, firstBody: unknown, module: string): Measure => {
	const marks = timeline(debugLog);
	return {
		settledMs: settled(marks, module, EVENT)[0]?.ms,
		settledFirst: settledBeforeFirstRequest(marks, module, EVENT),
		listed: lists(firstBody),
	};
};

const lists = (body: unknown): boolean => JSON.stringify(body ?? null).includes(LISTED);

const listing = (skill: string) => ({
	messages: [{ role: "user", content: [{ type: "text", text: `<system-reminder>\n${skill}: Review the changed code.\n</system-reminder>` }] }],
});

export const keptOut: SyncGrader<unknown> = {
	name: "simplify kept out of the first request",
	fixtures: { good: [listing("- verify"), {}], bad: [listing("- simplify")] },
	grade: (body): Verdict => {
		const listed = lists(body);
		return { pass: !listed, label: listed ? "listed" : "kept out", evidence: listed ? `body holds ${JSON.stringify(LISTED)}` : "absent" };
	},
};
