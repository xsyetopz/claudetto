/** The moves that change the stored view of one session: set, clear, ask, fail, and the answer bookkeeping. */

import type { EngineInterface } from "claude-code";

import { rowOf, storedCount, type View, withRow } from "../../session/rows";
import { fault } from "../../shared/fault";
import { markKnown } from "../../shared/store";

export type State = ReturnType<typeof stateMoves>;

export function stateMoves($: EngineInterface, sid: string) {
	const setView = async (view: View | undefined): Promise<void> => {
		const rows = await $.store.get("sessions");
		await $.store.set(
			"sessions",
			withRow(rows, { ...(rowOf(rows, sid) ?? { id: sid }), view })
		);
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
		} catch (error) {
			// the streak stays as it was
			fault($, "answer reset", error);
		}
	};
	const fail = async (reason: string): Promise<void> => {
		await setView({ kind: "failed", reason });
		$.ui.invalidate("ui.render");
	};
	return { setView, clear, know, answered, fail };
}
