import { handoffPath } from "./handoff.ts";
import { readBackText } from "./read-back.ts";
import { fieldsOf, toolHandoffText } from "./tool.ts";

/** What the handoff does to the session, built from `$` in the module that registers the hook. */
export interface Session {
	readonly write: (path: string, text: string) => Promise<unknown>;
	readonly clear: () => Promise<unknown>;
	readonly submit: (text: string) => Promise<unknown>;
	/** Records the file as taken in, so a later resume does not inject it again. */
	readonly taken: (name: string) => Promise<unknown>;
	readonly abort: (turnId: string) => Promise<unknown>;
	readonly log: (line: string) => void;
	/** Runs `work` from a timer: `$.command.run` is queued until the session is idle, and it is not idle while the call waits. */
	readonly later: (work: () => Promise<void>) => void;
}

/** Set from the plugin's own call until its clear and submit are done, so one call hands off once. */
let handingOff = false;

/** The main loop's running turn, which the tool ends. */
let heldTurn: string | undefined;

export const holdTurn = (turnId: string | undefined): void => {
	heldTurn = turnId;
};

const clearAndSubmit = async (
	session: Session,
	name: string,
	text: string,
): Promise<void> => {
	try {
		await session.clear();
	} catch (error) {
		session.log(
			`The handoff was written to \`${name}\`, and the clear failed (${error})`,
		);
		return;
	}
	try {
		await session.taken(name);
		await session.submit(text);
	} catch (error) {
		session.log(
			`The session was cleared, and the handoff \`${name}\` was not sent (${error})`,
		);
	}
};

/** Aborting the turn spares the request that would read the whole context only to answer the tool's result. */
const endTurn = async (session: Session): Promise<void> => {
	if (heldTurn === undefined) {
		return;
	}
	try {
		await session.abort(heldTurn);
	} catch (error) {
		session.log(`The turn could not be ended after the handoff (${error})`);
	}
};

export const handOff = async (
	session: Session,
	input: Readonly<Record<string, unknown>>,
): Promise<string> => {
	if (handingOff) {
		return "A handoff is already in progress. Do nothing more.";
	}
	const read = fieldsOf(input);
	if ("missing" in read) {
		return `Nothing was written. Call the tool again with: ${read.missing.join(", ")}.`;
	}
	const { fields } = read;
	const at = new Date();
	const path = handoffPath(at);
	const name = path.split("/").at(-1) ?? path;
	const text = toolHandoffText(fields, at.toISOString());
	try {
		await session.write(path, text);
	} catch (error) {
		return `The handoff could not be saved to \`${path}\` (${error}). Nothing was cleared.`;
	}
	handingOff = true;
	const first = `${readBackText(name, text)}\n\n${fields.nextPrompt}`;
	session.later(async () => {
		try {
			await clearAndSubmit(session, name, first);
		} finally {
			handingOff = false;
		}
	});
	await endTurn(session);
	return `The handoff is saved to \`${path}\`. The session clears when this turn ends. Do nothing more.`;
};
