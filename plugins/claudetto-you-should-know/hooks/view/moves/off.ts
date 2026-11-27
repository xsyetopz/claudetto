/** The moves that turn the plugin off from the note: the second press fills the disable command. */

import type { EngineInterface } from "claude-code";

import {
	isSameShowing,
	type OpenView,
	rowOf,
	withRow
} from "../../session/rows";
import { OFF_COMMAND } from "../../shared/constants";
import { fault, swallow } from "../../shared/fault";
import { keepsDraft, OFF_BOX_BUSY, replacing } from "../draft";
import type { State } from "./state";

export function offMoves($: EngineInterface, sid: string, state: State) {
	const takeOff = async (line: string): Promise<void> => {
		if (
			keepsDraft(
				$,
				await $.prompt.read().catch(swallow($, "off read")),
				OFF_BOX_BUSY
			)
		) {
			return;
		}
		await state.setView({ kind: "off", line, shownAt: Date.now() });
		$.ui.invalidate("ui.render");
		void state.answered("turn_off");
		const filled = await $.prompt.fill(replacing(OFF_COMMAND));
		if (!filled.isFilled) {
			await state.answered("off_failed");
			await state.fail("turn_off").catch(swallow($, "off failed view"));
		}
	};
	const armOff = async (view: OpenView): Promise<void> => {
		try {
			const cur = rowOf(await $.store.get("sessions"), sid)?.view;
			if (!isSameShowing(cur, view) || cur.kind !== "offer") {
				return;
			}
			if (cur.isOffArmed === true) {
				await takeOff(cur.line);
				return;
			}
			const rows = await $.store.get("sessions");
			await $.store.set(
				"sessions",
				withRow(rows, {
					...(rowOf(rows, sid) ?? { id: sid }),
					view: { ...cur, isOffArmed: true }
				})
			);
			$.ui.invalidate("ui.render");
		} catch (error) {
			// the second press arms again
			fault($, "arm off", error);
		}
	};
	return { takeOff, armOff };
}
