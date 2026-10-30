import { RESET } from "./cadence.ts";
import { parseExplanation } from "./cards.ts";
import type { ButtonKey } from "./choices.ts";
import { hasCards } from "./choices.ts";
import { BORROWED } from "./constants.ts";
import { draftOf } from "./draft.ts";
import { remember } from "./lines.ts";
import { loadRow, type Ports, saveCounters, saveRow } from "./ports.ts";
import { KEYS, listOf, type Row, type View } from "./rows.ts";

const closed = (row: Row): Row => ({ ...row, view: null });

const withView = (row: Row, view: View): Row => ({ ...row, view });

const learnLine = async (p: Ports, view: View): Promise<void> => {
	const known = listOf(await p.read(KEYS.KNOWN));
	await p.write(KEYS.KNOWN, remember(known, view.line));
};

/** The close is not an answer, so it leaves both counters as they are. */
const expire = async (p: Ports, id: string, shownAt: number): Promise<void> => {
	const row = await loadRow(p, id);
	if (row.view?.kind !== "asked" || row.view.shownAt !== shownAt) {
		return;
	}
	await saveRow(p, closed(row));
	p.refresh();
};

const BOX_BUSY =
	"Your prompt box has text in it. Send or clear it, then press 2 again.";

const BLOCKED = "A dialog has the keyboard. Answer it, then press 2 again.";

const NOT_FILLED = "The prompt box didn't take the note. Press 2 to try again.";

const knowAndClose = async (p: Ports, row: Row, view: View): Promise<void> => {
	await saveCounters(p, RESET);
	await learnLine(p, view);
	await saveRow(p, closed(row));
};

/** Only a note that reached the session is an answer: a refusal leaves the view and the counters as they are. */
const respond = async (p: Ports, row: Row, view: View): Promise<void> => {
	if ((await p.box()).trim() !== "") {
		p.toast(BOX_BUSY);
		return;
	}
	const draft = draftOf(row.tag, view.line, parseExplanation(view.explanation));
	const filled = await p.fill(`${draft}\n\n`);
	if (filled.isFilled) {
		await knowAndClose(p, row, view);
		return;
	}
	if (filled.refusal !== "no_composer") {
		p.toast(filled.refusal === "dialog" ? BLOCKED : NOT_FILLED);
		return;
	}
	await knowAndClose(p, row, view);
	await p.submit(draft);
};

const ask = async (p: Ports, row: Row, view: View): Promise<void> => {
	const shownAt = p.now();
	await saveRow(p, withView(row, { ...view, kind: "asked", shownAt }));
	p.later(BORROWED.ASKED_MS, () => {
		expire(p, row.id, shownAt).catch(() => undefined);
	});
};

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

/** A press on a view no longer open does nothing: the row may have closed between draw and press. */
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
	switch (key) {
		case "dismiss":
			if (view.kind === "asked") {
				await saveRow(p, closed(row));
				p.refresh();
				return;
			}
			break;
		case "respond":
			await respond(p, row, view);
			p.refresh();
			return;
		default:
			break;
	}
	await saveCounters(p, RESET);
	await apply(p, row, view, key);
	p.refresh();
};
