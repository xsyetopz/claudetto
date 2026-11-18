/** Picks the row to draw for the stored view and wires its presses to the actions. */

import { parseExplanation } from "./cards";
import type { Ctx } from "./context";
import { noteTopic } from "./draft";
import { fitCards } from "./fit";
import { aboutFrame, aboutKeyOf } from "./copy";
import {
	askedRow,
	explainedAskedRow,
	explainedRow,
	explainingRow,
	failedRow,
	makingRow,
	offerRow,
	readyRow,
} from "./rows";
import { iterationOf, type View } from "./session-rows";
import { hasOwnComposer, type Table } from "./table";
import type { Actions } from "./view-actions";

export type RowArgs = {
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
};

/** A press that counts once: the row can be pressed twice before it is redrawn. */
function once(fn: () => unknown): () => void {
	let isDone = false;
	return () => {
		if (!isDone) {
			isDone = true;
			void fn();
		}
	};
}

export function rowFor(args: RowArgs): unknown {
	const { view, sid, tag, surface, props, table, actions, ctx } = args;
	if (view === null) {
		return null;
	}
	switch (view.kind) {
		case "making":
			return makingRow(table);
		case "ready": {
			let isAnswered = false;
			const answer = (name: string) => () => {
				if (!isAnswered) {
					isAnswered = true;
					void actions.answered(name).then(() => actions.clear());
				}
			};
			return readyRow(table, view.url, {
				helpful: answer("page_helpful"),
				notHelpful: answer("page_not_helpful"),
				unread: answer("page_unread"),
			});
		}
		case "failed":
			return failedRow(table, view.reason, () => void actions.clear());
		case "explaining":
			return explainingRow(table);
		case "off":
			return null;
		case "asked": {
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
					dismiss: guard(actions.timeout),
				});
			}
			return askedRow(table, {
				helpful: mk("helpful", know),
				notRelevant: mk("not_relevant"),
				notUnderstood: mk("not_understood"),
				off: hasOwnComposer(surface) ? undefined : guard(() => actions.takeOff(view.line, "row")),
				dismiss: guard(actions.timeout),
			});
		}
		case "explained":
		case "offer": {
			const { line } = view;
			const shownAt = view.shownAt;
			const iteration = iterationOf(view);
			const mk = (name: string, then: () => unknown) =>
				once(async () => {
					ctx.autoSent.add(aboutKeyOf({ line, shownAt }));
					await actions.answered(name);
					await then();
				});
			if (view.kind === "explained") {
				const cards = fitCards(parseExplanation(view.text), props.bodyColumns);
				return explainedRow(
					table,
					noteTopic(line),
					cards,
					props.hasSurvey
						? null
						: {
								gotIt: mk("got_it", () => actions.know(line)),
								respond: once(() => {
									ctx.autoSent.add(aboutKeyOf({ line, shownAt }));
									return actions.respond(line, cards, tag);
								}),
								dismiss: mk("dismiss", () => actions.ask({ line, ...(iteration === undefined ? {} : { iteration }) })),
							},
					tag,
				);
			}
			const noOff = hasOwnComposer(surface) || args.isOptIn;
			return offerRow(
				table,
				line,
				{
					explain: mk("yes_explain", () => {
						if (view.explanation !== undefined && parseExplanation(view.explanation).length > 0) {
							return actions.showExplained(line, view.explanation, 1);
						}
						return actions.explain(line, undefined, 1);
					}),
					knew: mk("know_it", () => actions.know(line)),
					off: noOff
						? undefined
						: once(() => {
								ctx.autoSent.add(aboutKeyOf({ line, shownAt }));
								return actions.armOff(view);
							}),
					later: mk("not_now", () => actions.ask({ line })),
				},
				view.isOffArmed === true,
				{
					isOpen: args.isAboutOpen,
					surface,
					...aboutFrame(hasOwnComposer(surface), props, args.isOptIn),
					onPress: () => {
						ctx.idle.delete(sid);
						args.toggleAbout(aboutKeyOf(view));
					},
				},
				tag,
			);
		}
	}
}
