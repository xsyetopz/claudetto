import type { Report } from "./spec";

/** A finding that should block completion. */
export interface HardFinding {
	/** Which part of the report it came from. */
	kind: "malformed" | "tampered" | "orphan";
	/** The ID or path it is about. */
	subject: string;
	/** One line the agent can act on. */
	message: string;
}

function tamperNote(t: Report["tampered"][number]): string {
	if (t.deleted) {
		return "was deleted";
	}
	const notes = [
		...(t.addedMarkers.length > 0
			? [`gained ${t.addedMarkers.join(" ")}`]
			: []),
		...(t.assertions === null
			? []
			: [
					`dropped assertions from ${t.assertions.before} to ${t.assertions.after}`
				])
	];
	return notes.join(" and ");
}

/**
 * The findings of a `spec_check` report that should block completion.
 *
 * Hard findings are a malformed spec, a staged test that was deleted, gained a skip or
 * only marker or lost assertions, and an orphan ID. A requirement removed or reworded is
 * the agent's to make and is shown to the person, not blocked. Inflated requirements,
 * uncovered IDs, citation-only tests and plain edits to staged tests are advice, so they
 * stay out. The signature is stable for callers such as a Stop hook.
 *
 * @param report What `checkSpecs` returned.
 * @returns The blocking findings in report order; empty when the report is clean.
 */
export function hardFindings(report: Report): HardFinding[] {
	const found: HardFinding[] = [];
	for (const m of report.malformed) {
		found.push({
			kind: "malformed",
			subject: `${m.file}:${m.line}`,
			message: `\`${m.file}:${m.line}\` is malformed: ${m.reason}`
		});
	}
	for (const t of report.tampered) {
		found.push({
			kind: "tampered",
			subject: t.file,
			message: `\`${t.file}\` ${tamperNote(t)} since it was staged`
		});
	}
	for (const id of report.orphans) {
		found.push({
			kind: "orphan",
			subject: id,
			message: `tests cite \`${id}\`, which no spec defines`
		});
	}
	return found;
}
