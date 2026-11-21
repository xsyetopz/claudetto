/** The moves that show an explanation: ask the model for one, or show one already written. */

import type { EngineInterface } from "claude-code";

import { parseExplanation } from "../../request/cards";
import { explainPrompt, type Redo } from "../../request/prompt";
import type { Ctx } from "../../shared/context";
import { swallow } from "../../shared/fault";
import type { State } from "./state";

export function explainMoves(
	$: EngineInterface,
	sid: string,
	ctx: Ctx,
	state: State
) {
	const showExplained = async (
		line: string,
		text: string,
		iteration: number
	): Promise<void> => {
		await state.setView({
			kind: "explained",
			line,
			text,
			iteration,
			shownAt: Date.now()
		});
		ctx.promptsSince.delete(sid);
		$.ui.invalidate("ui.render");
	};
	const explain = async (
		line: string,
		redo: { readonly direction: Redo; readonly previous: string } | undefined,
		iteration: number
	): Promise<void> => {
		ctx.explaining.add(sid);
		try {
			await state.setView({ kind: "explaining", line, iteration });
			$.ui.invalidate("ui.render");
			const r = await $.model
				.fork({ prompt: explainPrompt(line, redo) })
				.catch(swallow($, "explain fork"));
			const text = r?.isAnswered === true ? r.text.trim() : "";
			const isShown =
				r?.isAnswered === true && parseExplanation(text).length > 0;
			const previous =
				redo === undefined
					? undefined
					: { text: redo.previous, iteration: iteration - 1 };
			const chosen = isShown ? { text, iteration } : previous;
			await (chosen === undefined
				? state.fail("explain")
				: showExplained(line, chosen.text, chosen.iteration));
		} finally {
			ctx.explaining.delete(sid);
		}
	};
	return { showExplained, explain };
}
