/** What a press on the note row does to the stored row, bound to one session. */

import type { EngineInterface } from "claude-code";

import type { Ctx } from "../shared/context";
import { askedMoves } from "./moves/asked";
import { explainMoves } from "./moves/explain";
import { offMoves } from "./moves/off";
import { respondMove } from "./moves/respond";
import { stateMoves } from "./moves/state";

export interface Fields {
	readonly line: string;
	readonly shownAt?: number | undefined;
	readonly iteration?: number | undefined;
}

/** Every move the person can make on this session's note. */
export type Actions = ReturnType<typeof actionsFor>;

export function actionsFor($: EngineInterface, sid: string, ctx: Ctx) {
	const state = stateMoves($, sid);
	return {
		...state,
		...askedMoves($, sid, ctx, state),
		...offMoves($, sid, state),
		...explainMoves($, sid, ctx, state),
		respond: respondMove($, sid, ctx, state)
	};
}
