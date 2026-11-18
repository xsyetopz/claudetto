/** What a press on the note row does to the stored row, bound to one session. */

import type { EngineInterface } from "claude-code";

import { ASKED_MS } from "../constants";
import type { Ctx } from "../context";
import { keepsDraft, OFF_BOX_BUSY } from "../draft";
import { parseExplanation } from "../cards";
import { OFF_COMMAND } from "../constants";
import { explainPrompt, type Redo } from "../prompt";
import {
	isSameShowing,
	type OpenView,
	rowOf,
	storedCount,
	type View,
	withRow,
} from "../session/rows";
import { markKnown } from "../store";
import {
	RESPOND_BLOCKED,
	RESPOND_BOX_BUSY,
	RESPOND_NOT_FILLED,
	respondDraft,
} from "../draft";
import type { Card } from "../cards";
import { fault, swallow } from "../fault";

export type Fields = { readonly line: string; readonly shownAt?: number | undefined; readonly iteration?: number | undefined };

/** Every move the person can make on this session's note. */
export type Actions = ReturnType<typeof actionsFor>;

export function actionsFor($: EngineInterface, sid: string, ctx: Ctx) {
	const setView = async (view: View | undefined): Promise<void> => {
		const rows = await $.store.get("sessions");
		await $.store.set("sessions", withRow(rows, { ...(rowOf(rows, sid) ?? { id: sid }), view }));
	};
	const clear = async (): Promise<void> => {
		await setView(undefined);
		$.ui.invalidate("ui.render");
	};
	const know = async (line: string): Promise<void> => {
		try {
			await markKnown($, line);
		} finally {
			await clear();
		}
	};
	const answered = async (name: string): Promise<void> => {
		if (name === "ignored_timeout") {
			return;
		}
		try {
			if (storedCount(await $.store.get("typedPastInARow")) > 0) {
				await $.store.set("typedPastInARow", 0);
				await $.store.set("looksToSkip", 0);
			}
		} catch (err) {
			// the streak stays as it was
			fault($, "answer reset", err);
		}
	};
	const timeout = async (): Promise<void> => {
		ctx.askedTimers.delete(sid);
		const view = rowOf(await $.store.get("sessions"), sid)?.view;
		if (view?.kind !== "asked") {
			return;
		}
		await clear();
	};
	const ask = async (fields: { readonly line: string; readonly iteration?: number }): Promise<void> => {
		await setView({ kind: "asked", ...fields, shownAt: Date.now() });
		$.ui.invalidate("ui.render");
		ctx.askedTimers.get(sid)?.cancel();
		ctx.askedTimers.set(
			sid,
			$.clock.after(ASKED_MS, () => {
				void timeout().catch(swallow($, "asked timeout"));
			}),
		);
	};
	const fail = async (reason: string): Promise<void> => {
		await setView({ kind: "failed", reason });
		$.ui.invalidate("ui.render");
	};
	const takeOff = async (line: string, via: string): Promise<void> => {
		void via;
		if (keepsDraft($, await $.prompt.read().catch(swallow($, "off read")), OFF_BOX_BUSY)) {
			return;
		}
		await setView({ kind: "off", line, shownAt: Date.now() });
		$.ui.invalidate("ui.render");
		void answered("turn_off");
		const filled = (await $.prompt.fill({ text: OFF_COMMAND, mode: "replace" })).isFilled;
		if (!filled) {
			await answered("off_failed");
			await fail("turn_off").catch(swallow($, "off failed view"));
		}
	};
	const armOff = async (view: OpenView): Promise<void> => {
		try {
			const cur = rowOf(await $.store.get("sessions"), sid)?.view;
			if (!isSameShowing(cur, view) || cur.kind !== "offer") {
				return;
			}
			if (cur.isOffArmed === true) {
				await takeOff(cur.line, "offer");
				return;
			}
			const rows = await $.store.get("sessions");
			await $.store.set(
				"sessions",
				withRow(rows, { ...(rowOf(rows, sid) ?? { id: sid }), view: { ...cur, isOffArmed: true } }),
			);
			$.ui.invalidate("ui.render");
		} catch (err) {
			// the second press arms again
			fault($, "arm off", err);
		}
	};
	const showExplained = async (line: string, text: string, iteration: number): Promise<void> => {
		await setView({ kind: "explained", line, text, iteration, shownAt: Date.now() });
		ctx.promptsSince.delete(sid);
		$.ui.invalidate("ui.render");
	};
	const explain = async (line: string, redo: { readonly direction: Redo; readonly previous: string } | undefined, iteration: number): Promise<void> => {
		ctx.explaining.add(sid);
		try {
			await setView({ kind: "explaining", line, iteration });
			$.ui.invalidate("ui.render");
			const r = await $.model.fork({ prompt: explainPrompt(line, redo) }).catch(swallow($, "explain fork"));
			const text = r?.isAnswered === true ? r.text.trim() : "";
			const isShown = r?.isAnswered === true && parseExplanation(text).length > 0;
			const previous =
				redo === undefined ? undefined : { text: redo.previous, iteration: iteration - 1 };
			const chosen = isShown ? { text, iteration } : previous;
			await (chosen === undefined ? fail("explain") : showExplained(line, chosen.text, chosen.iteration));
		} finally {
			ctx.explaining.delete(sid);
		}
	};
	const respond = async (line: string, cards: readonly Card[], tag: string): Promise<void> => {
		if (ctx.responding.has(sid)) {
			return;
		}
		ctx.responding.add(sid);
		try {
			const draft = respondDraft(line, cards, tag);
			if (keepsDraft($, await $.prompt.read().catch(swallow($, "respond read")), RESPOND_BOX_BUSY)) {
				return;
			}
			const filled = await $.prompt.fill({ text: `${draft}\n\n`, mode: "replace" }).catch(swallow($, "respond fill"));
			if (filled?.isFilled === true) {
				await answered("respond");
				await know(line);
				return;
			}
			if (filled?.refusal !== "no_composer") {
				$.ui.toast(filled?.refusal === "dialog" ? RESPOND_BLOCKED : RESPOND_NOT_FILLED);
				$.ui.invalidate("ui.render");
				return;
			}
			await answered("respond");
			await know(line).catch(swallow($, "respond know"));
			await $.prompt.submit({ text: draft }).catch(swallow($, "respond submit"));
		} finally {
			ctx.responding.delete(sid);
		}
	};
	return { setView, clear, know, answered, timeout, ask, fail, takeOff, armOff, showExplained, explain, respond };
}
