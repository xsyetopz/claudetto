/** What a row binding reads: the stored view, the session, the surface's table and the moves. */

import type { View } from "../../session/rows";
import type { Ctx } from "../../shared/context";
import type { Actions } from "../actions";
import type { Table } from "../table";

export interface RowArgs {
	readonly view: View | null;
	readonly sid: string;
	readonly tag: string;
	readonly surface: string;
	readonly props: {
		readonly bodyColumns: number;
		readonly maxRows: number;
		readonly hasSurvey: boolean;
	};
	readonly table: Table;
	readonly actions: Actions;
	readonly ctx: Ctx;
	readonly isOptIn: boolean;
	readonly isAboutOpen: boolean;
	readonly toggleAbout: (key: string) => void;
}

/** A press that counts once: the row can be pressed twice before it is redrawn. */
export function once(fn: () => unknown): () => void {
	let isDone = false;
	return () => {
		if (!isDone) {
			isDone = true;
			void fn();
		}
	};
}
