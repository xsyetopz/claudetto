// What a pressed key does to the stored state: the line joins the known list, the view closes or
// moves on, and the two back-off counters reset. The reset is the move that the original made inside
// the function that also sent its answered event (`docs/keep/plugins/you-should-know-design.txt:160`),
// kept here with the event dropped.

import { RESET } from "./cadence.ts";
import type { ButtonKey } from "./choices.ts";
import { hasCards } from "./choices.ts";
import { BORROWED } from "./constants.ts";
import { remember } from "./lines.ts";
import { loadRow, type Ports, saveCounters, saveRow } from "./ports.ts";
import { KEYS, listOf, type Row, type View } from "./rows.ts";

const closed = (row: Row): Row => ({ ...row, view: null });

const withView = (row: Row, view: View): Row => ({ ...row, view });

/** The known list with the line of the open view added. */
const learnLine = async (p: Ports, view: View): Promise<void> => {
	const known = listOf(await p.read(KEYS.KNOWN));
	await p.write(KEYS.KNOWN, remember(known, view.line));
};

/**
 * A dismissed offer waits for an answer, then closes. The close is not an answer, so it leaves both
 * counters as they are (`docs/keep/plugins/you-should-know-design.txt:123`).
 */
const expire = async (p: Ports, id: string, shownAt: number): Promise<void> => {
	const row = await loadRow(p, id);
	if (row.view?.kind !== "asked" || row.view.shownAt !== shownAt) {
		return;
	}
	await saveRow(p, closed(row));
	p.refresh();
};

const ask = async (p: Ports, row: Row, view: View): Promise<void> => {
	const shownAt = p.now();
	await saveRow(p, withView(row, { ...view, kind: "asked", shownAt }));
	p.later(BORROWED.ASKED_MS, () => {
		expire(p, row.id, shownAt).catch(() => undefined);
	});
};

/** What the key does to the open view, after the counters were reset. */
const apply = async (
	p: Ports,
	row: Row,
	view: View,
	key: ButtonKey,
): Promise<void> => {
	switch (key) {
		case "learn":
			if (hasCards(view)) {
				await saveRow(p, withView(row, { ...view, kind: "explained" }));
			}
			break;
		case "dismiss":
			await ask(p, row, view);
			break;
		case "know":
		case "helpful":
		case "understood":
			await learnLine(p, view);
			await saveRow(p, closed(row));
			break;
		case "not-relevant":
		case "not-understood":
			await saveRow(p, closed(row));
			break;
		default:
			break;
	}
};

/**
 * The key `key` pressed on the view of session `id`. A press on a view that is no longer open does
 * nothing, because the row may have closed between the draw and the press.
 */
export const press = async (
	p: Ports,
	id: string,
	key: ButtonKey,
): Promise<void> => {
	const row = await loadRow(p, id);
	const view = row.view;
	if (view === null) {
		return;
	}
	if (key === "dismiss" && view.kind === "asked") {
		await saveRow(p, closed(row));
		p.refresh();
		return;
	}
	await saveCounters(p, RESET);
	await apply(p, row, view, key);
	p.refresh();
};
