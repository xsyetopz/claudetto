import {
	closed,
	draftFor,
	fillOutcome,
	LIMITS,
	type Row,
	type View,
} from "./note.ts";
import { type Engine, learn, loadRow, saveBackoff, saveRow } from "./store.ts";
import { TOAST_BOX_HAS_TEXT } from "./texts.ts";
import { type ButtonKey, hasCards } from "./view.ts";

async function expire($: Engine, id: string, shownAt: number): Promise<void> {
	const row = await loadRow($, id);
	if (row.view?.kind === "asked" && row.view.shownAt === shownAt) {
		await saveRow($, closed(row));
		$.ui.invalidate("ui.render");
	}
}

async function knowAndClose($: Engine, row: Row, view: View): Promise<void> {
	await saveBackoff($, 0, 0);
	await learn($, view.line);
	await saveRow($, closed(row));
}

async function chat($: Engine, row: Row, view: View): Promise<void> {
	const typed = await $.prompt.read();
	if (typed.text.trim() !== "") {
		$.ui.toast(TOAST_BOX_HAS_TEXT);
		return;
	}
	const draft = draftFor(row.tag, view);
	// The array rule reads any `.fill` call as `Array.prototype.fill`; a frozen object is no shared reference.
	const replacement = Object.freeze({
		text: `${draft}\n\n`,
		mode: "replace",
	} as const);
	const outcome = fillOutcome(await $.prompt.fill(replacement));
	if (outcome.next === "toast") {
		$.ui.toast(outcome.text);
		return;
	}
	await knowAndClose($, row, view);
	if (outcome.next === "submit") {
		await $.prompt.submit({ text: draft });
	}
}

async function askWhy($: Engine, row: Row, view: View): Promise<void> {
	const shownAt = Date.now();
	await saveRow($, { ...row, view: { ...view, kind: "asked", shownAt } });
	$.clock.after(LIMITS.askedMs, () => {
		expire($, row.id, shownAt).catch(() => void 0);
	});
}

async function answer(
	$: Engine,
	row: Row,
	view: View,
	key: Exclude<ButtonKey, "respond">,
): Promise<void> {
	switch (key) {
		case "learn": {
			if (hasCards(view)) {
				await saveRow($, { ...row, view: { ...view, kind: "explained" } });
			}
			break;
		}
		case "dismiss": {
			await askWhy($, row, view);
			break;
		}
		case "know":
		case "helpful":
		case "understood": {
			await learn($, view.line);
			await saveRow($, closed(row));
			break;
		}
		case "not-relevant":
		case "not-understood": {
			await saveRow($, closed(row));
			break;
		}
	}
}

/** Applies the press of one button of the note in session `id`. */
export async function press(
	$: Engine,
	id: string,
	key: ButtonKey,
): Promise<void> {
	const row = await loadRow($, id);
	const { view } = row;
	if (view === null) {
		return;
	}
	if (key === "respond") {
		await chat($, row, view);
	} else if (key === "dismiss" && view.kind === "asked") {
		await saveRow($, closed(row));
	} else {
		await saveBackoff($, 0, 0);
		await answer($, row, view, key);
	}
	$.ui.invalidate("ui.render");
}
