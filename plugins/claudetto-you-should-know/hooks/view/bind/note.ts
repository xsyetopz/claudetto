/** Wires the presses of the offer and explained rows to the moves. */

import { parseExplanation } from "../../request/cards";
import { iterationOf, type View } from "../../session/rows";
import { fitCards } from "../../text/fit";
import { aboutFrame, aboutKeyOf } from "../copy";
import { noteTopic } from "../draft";
import type { Node } from "../parts/elements";
import { explainedRow } from "../parts/explained";
import { offerRow } from "../parts/offer";
import { hasOwnComposer } from "../table";
import { once, type RowArgs } from "./args";

type NoteView = Extract<View, { kind: "explained" | "offer" }>;

/** A press that records the answer, runs the move and marks the note as already sent. */
const answerPress = (args: RowArgs, view: NoteView) => {
	const { line, shownAt } = view;
	return (name: string, then: () => unknown) =>
		once(async () => {
			args.ctx.autoSent.add(aboutKeyOf({ line, shownAt }));
			await args.actions.answered(name);
			await then();
		});
};

export function explainedBinding(
	args: RowArgs,
	view: Extract<View, { kind: "explained" }>
): Node {
	const { props, actions, ctx, tag } = args;
	const { line, shownAt } = view;
	const mk = answerPress(args, view);
	const iteration = iterationOf(view);
	const cards = fitCards(parseExplanation(view.text), props.bodyColumns);
	return explainedRow(
		args.table,
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
					dismiss: mk("dismiss", () =>
						actions.ask({
							line,
							...(iteration === undefined ? {} : { iteration })
						})
					)
				},
		tag
	);
}

export function offerBinding(
	args: RowArgs,
	view: Extract<View, { kind: "offer" }>
): Node {
	const { sid, surface, props, actions, ctx, tag } = args;
	const { line, shownAt } = view;
	const mk = answerPress(args, view);
	const noOff = hasOwnComposer(surface) || args.isOptIn;
	return offerRow(
		args.table,
		line,
		{
			explain: mk("yes_explain", () => {
				if (
					view.explanation !== undefined &&
					parseExplanation(view.explanation).length > 0
				) {
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
			later: mk("not_now", () => actions.ask({ line }))
		},
		view.isOffArmed === true,
		{
			isOpen: args.isAboutOpen,
			surface,
			...aboutFrame(hasOwnComposer(surface), props, args.isOptIn),
			onPress: () => {
				ctx.idle.delete(sid);
				args.toggleAbout(aboutKeyOf(view));
			}
		},
		tag
	);
}
