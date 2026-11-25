/** The recheck prompt: asks whether a shown note still holds, and the strict reading of its one-word answer. */

import type { Statement } from "../judge/judge";
import { SIDE_REQUEST_FRAME } from "./prompt";

export type Verdict = "keep" | "drop";

/** The prompt that asks the fork whether the shown note still holds after what came later. */
export const recheckPrompt = (
	line: string,
	explanation: string | undefined
): string => `${SIDE_REQUEST_FRAME}

<role>
You are a quiet observer beside a long coding session. A note was shown to the person a little while ago, and the session has moved on since.
</role>

<note>
${line}${explanation === undefined ? "" : `\n${explanation}`}
</note>

<task>
Read what happened in the session after the note was shown. Decide whether any of it makes the note untrue or no longer applicable, for example a fix that removes the problem the note names, or a change that settles the choice it describes.
Answer DROP when something later makes the note untrue or no longer applicable. Answer KEEP when the note still holds or when you cannot tell.
</task>

<format>
Reply with one word and nothing else: KEEP or DROP.
</format>`;

/**
 * The recheck as a statement Jev rates, beside the fork prompt above: `note` is
 * the shown note and `after` the reply text since. A yes drops the note; a no
 * or an unsettled rating keeps it, as the fork's "cannot tell" does.
 */
export const NOTE_NO_LONGER_HOLDS: Statement = {
	id: "note_no_longer_holds",
	statement:
		"`after` shows something that makes `note` untrue or no longer applicable, for example a fix that removes the problem `note` names, or a change that settles the choice it describes."
};

/** Reads the reply strictly: only `KEEP` or `DROP`, alone, counts; anything else is `undefined`. */
export function parseVerdict(text: string): Verdict | undefined {
	const word = text.trim();
	if (word === "DROP") {
		return "drop";
	}
	return word === "KEEP" ? "keep" : undefined;
}
