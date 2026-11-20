/** The move that turns a card into a drafted reply in the prompt box. */

import type { EngineInterface } from "claude-code";

import type { Card } from "../../request/cards";
import type { Ctx } from "../../shared/context";
import { swallow } from "../../shared/fault";
import {
	keepsDraft,
	replacing,
	RESPOND_BLOCKED,
	RESPOND_BOX_BUSY,
	RESPOND_MAYBE_FILLED,
	RESPOND_NOT_FILLED,
	respondDraft
} from "../draft";
import type { State } from "./state";

/** Tells the person why the box refused the draft; the card stays so they can try again. */
function toastRefusal(
	$: EngineInterface,
	refusal: "no_composer" | "dialog" | "unanswered" | undefined
): void {
	// `unanswered` (2.1.330): an app was asked and none answered, so the text may have landed.
	const text = {
		dialog: RESPOND_BLOCKED,
		unanswered: RESPOND_MAYBE_FILLED,
		no_composer: RESPOND_NOT_FILLED
	}[refusal ?? "no_composer"];
	$.ui.toast(text);
	$.ui.invalidate("ui.render");
}

export function respondMove(
	$: EngineInterface,
	sid: string,
	ctx: Ctx,
	state: State
) {
	return async (
		line: string,
		cards: readonly Card[],
		tag: string
	): Promise<void> => {
		if (ctx.responding.has(sid)) {
			return;
		}
		ctx.responding.add(sid);
		try {
			const draft = respondDraft(line, cards, tag);
			if (
				keepsDraft(
					$,
					await $.prompt.read().catch(swallow($, "respond read")),
					RESPOND_BOX_BUSY
				)
			) {
				return;
			}
			const filled = await $.prompt
				.fill(replacing(`${draft}\n\n`))
				.catch(swallow($, "respond fill"));
			if (filled?.isFilled === true) {
				await state.answered("respond");
				await state.know(line);
				return;
			}
			if (filled?.refusal !== "no_composer") {
				toastRefusal($, filled?.refusal);
				return;
			}
			await state.answered("respond");
			await state.know(line).catch(swallow($, "respond know"));
			await $.prompt
				.submit({ text: draft })
				.catch(swallow($, "respond submit"));
		} finally {
			ctx.responding.delete(sid);
		}
	};
}
