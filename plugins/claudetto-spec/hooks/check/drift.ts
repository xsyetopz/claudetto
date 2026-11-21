/** An ID that HEAD's spec file defines and no spec file defines now. */
export interface RemovedId {
	id: string;
	file: string;
}

/** An ID whose behaviour sentence differs from HEAD's. */
export interface Reworded {
	id: string;
	file: string;
	line: number;
}

/** One spec file's requirements as `driftOf` reads them. */
export interface SpecView {
	/** Behaviour prose by ID, whitespace collapsed. */
	behaviours: ReadonlyMap<string, string>;
	/** Heading line by ID. */
	lines: ReadonlyMap<string, number>;
	/** The file that defines each ID. */
	files: ReadonlyMap<string, string>;
}

/**
 * Compares one spec file's HEAD requirements with the current ones.
 *
 * An ID counts as removed only when no current spec defines it, so moving a requirement
 * between files is not drift. New IDs are never drift.
 *
 * @param file The spec file whose HEAD version `before` describes.
 * @param before Behaviour prose by ID in HEAD's version of `file`.
 * @param now Every requirement the work tree defines, from all spec files.
 */
export function driftOf(
	file: string,
	before: ReadonlyMap<string, string>,
	now: SpecView
): { removedIds: RemovedId[]; reworded: Reworded[] } {
	const removedIds: RemovedId[] = [];
	const reworded: Reworded[] = [];
	for (const [id, behaviour] of before) {
		const current = now.behaviours.get(id);
		if (current === undefined) {
			removedIds.push({ id, file });
		} else if (current !== behaviour) {
			reworded.push({
				id,
				file: now.files.get(id) ?? file,
				line: now.lines.get(id) ?? 1
			});
		}
	}
	return { removedIds, reworded };
}
