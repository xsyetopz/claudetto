import type { EngineInterface } from "claude-code";

import {
	HANDOFF_BUSY,
	HANDOFF_MISSING,
	HANDOFF_UNSAVED,
	readBackText,
} from "../texts-handoff.ts";
import { atRoot, handoffPath } from "./layout.ts";
import { readBackKey } from "./read-back.ts";
import { gitStatusOf, redactOf } from "./session.ts";
import { fieldsOf, toolHandoffText } from "./tool.ts";

/** One registration's state: whether a handoff runs, and the main loop's turn, which the tool ends. */
export interface CallState {
	handingOff: boolean;
	turn: string | undefined;
	/** The condition of the `/goal` the user set and has not cleared, from the `command.run` hook. */
	goal: string | undefined;
}

/** Sets the goal again: a clear ends the user's `/goal`. */
async function restoreGoal(
	$: EngineInterface,
	goal: string | undefined,
): Promise<void> {
	if (goal === undefined) {
		return;
	}
	try {
		await $.command.run({ command: "goal", args: goal });
	} catch (error) {
		$.ui.log(
			`The session was cleared and its goal \`${goal}\` was not set again (${String(error)})`,
		);
	}
}

async function clearAndSubmit(
	$: EngineInterface,
	goal: string | undefined,
	name: string,
	text: string,
): Promise<void> {
	try {
		await $.command.run({ command: "clear" });
	} catch (error) {
		$.ui.log(
			`The handoff is in \`${name}\`, and the clear failed (${String(error)})`,
		);
		return;
	}
	try {
		// The file is recorded as taken in, so a later resume does not inject it again.
		await $.store.set(readBackKey(await $.session.root()), name);
		await restoreGoal($, goal);
		await $.prompt.submit({ text });
	} catch (error) {
		$.ui.log(
			`The session was cleared, and the handoff \`${name}\` was not sent (${String(error)})`,
		);
	}
}

export async function handOff(
	$: EngineInterface,
	state: CallState,
	input: Readonly<Record<string, unknown>>,
): Promise<string> {
	if (state.handingOff) {
		return HANDOFF_BUSY;
	}
	const read = fieldsOf(input);
	if ("missing" in read) {
		return HANDOFF_MISSING(read.missing);
	}
	const at = new Date();
	const path = handoffPath(at);
	const name = path.split("/").at(-1) ?? path;
	const scrub = redactOf($);
	let first: string;
	try {
		const text = await scrub(
			toolHandoffText(read.fields, at.toISOString(), await gitStatusOf($)),
		);
		await $.fs.write(atRoot(await $.session.root(), path), text);
		first = `${readBackText(name, text)}\n\n${await scrub(read.fields.nextPrompt)}`;
	} catch (error) {
		return HANDOFF_UNSAVED(path, error);
	}
	state.handingOff = true;
	const { goal } = state;
	// The clear runs from a timer: `$.command.run` is queued until the session is idle, and it is not idle while the call waits.
	$.clock.after(0, () => {
		clearAndSubmit($, goal, name, first)
			.finally(() => {
				state.handingOff = false;
			})
			.catch(() => void 0);
	});
	// Ending the turn spares the request that would read the whole context only to answer this result.
	if (state.turn !== undefined) {
		await $.turn.abort({ turnId: state.turn }).catch((error: unknown) => {
			$.ui.log(
				`The turn could not be ended after the handoff (${String(error)})`,
			);
		});
	}
	return `The handoff is saved to \`${path}\`. The session clears when this turn ends. End your turn.`;
}
