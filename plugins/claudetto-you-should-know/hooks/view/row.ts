/** Picks the row to draw for the stored view and wires its presses to the actions. */

import type { RowArgs } from "./bind/args";
import { askedBinding } from "./bind/asked";
import { explainedBinding, offerBinding } from "./bind/note";
import type { Node } from "./parts/elements";
import { explainingRow } from "./parts/explained";
import { failedRow } from "./parts/status";

export type { RowArgs } from "./bind/args";

export function rowFor(args: RowArgs): Node {
	const { view, table, actions } = args;
	if (view?.kind === "failed") {
		return failedRow(table, view.reason, () => void actions.clear());
	}
	if (view?.kind === "explaining") {
		return explainingRow(table);
	}
	if (view?.kind === "asked") {
		return askedBinding(args, view);
	}
	if (view?.kind === "explained") {
		return explainedBinding(args, view);
	}
	return view?.kind === "offer" ? offerBinding(args, view) : null;
}
