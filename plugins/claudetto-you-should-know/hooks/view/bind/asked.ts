/** Wires the presses of the "was that useful" row to the moves. */

import { iterationOf, type View } from "../../session/rows";
import { askedRow, explainedAskedRow } from "../parts/asked";
import type { Node } from "../parts/elements";
import { hasOwnComposer } from "../table";
import { once, type RowArgs } from "./args";

export function askedBinding(
	args: RowArgs,
	view: Extract<View, { kind: "asked" }>
): Node {
	const { sid, surface, table, actions, ctx } = args;
	const guard = (fn: () => unknown) =>
		once(() => {
			ctx.askedTimers.get(sid)?.cancel();
			ctx.askedTimers.delete(sid);
			return fn();
		});
	const iteration = iterationOf(view);
	const mk = (name: string, then: () => Promise<void> = actions.clear) =>
		guard(async () => {
			await actions.answered(name);
			return then();
		});
	const know = () => actions.know(view.line);
	if (iteration !== undefined) {
		return explainedAskedRow(table, {
			helpful: mk("explained_helpful", know),
			notUnderstood: mk("explained_not_understood"),
			dismiss: guard(actions.timeout)
		});
	}
	return askedRow(table, {
		helpful: mk("helpful", know),
		notRelevant: mk("not_relevant"),
		notUnderstood: mk("not_understood"),
		off: hasOwnComposer(surface)
			? undefined
			: guard(() => actions.takeOff(view.line)),
		dismiss: guard(actions.timeout)
	});
}
