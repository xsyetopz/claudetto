/** The moves of the "was that useful" row: ask, and let it time out on its own. */

import type { EngineInterface } from "claude-code";

import { rowOf } from "../../session/rows";
import { ASKED_MS } from "../../shared/constants";
import type { Ctx } from "../../shared/context";
import { swallow } from "../../shared/fault";
import type { State } from "./state";

export function askedMoves(
	$: EngineInterface,
	sid: string,
	ctx: Ctx,
	state: State
) {
	const timeout = async (): Promise<void> => {
		ctx.askedTimers.delete(sid);
		const view = rowOf(await $.store.get("sessions"), sid)?.view;
		if (view?.kind !== "asked") {
			return;
		}
		await state.clear();
	};
	const ask = async (fields: {
		readonly line: string;
		readonly iteration?: number;
	}): Promise<void> => {
		await state.setView({ kind: "asked", ...fields, shownAt: Date.now() });
		$.ui.invalidate("ui.render");
		ctx.askedTimers.get(sid)?.cancel();
		ctx.askedTimers.set(
			sid,
			$.clock.after(ASKED_MS, () => {
				void timeout().catch(swallow($, "asked timeout"));
			})
		);
	};
	return { timeout, ask };
}
