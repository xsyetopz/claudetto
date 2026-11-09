import {
	HANDOFF_BUSY,
	HANDOFF_MISSING,
	HANDOFF_UNSAVED,
	readBackText,
} from "../texts.ts";
import { handoffPath } from "./layout.ts";
import { fieldsOf, toolHandoffText } from "./tool.ts";

/** What the handoff does to the session, built from `$` in the module that registers the hook. */
export interface Session {
	readonly write: (path: string, text: string) => Promise<unknown>;
	/** Rejects when the secret scanner cannot run. */
	readonly redact: (text: string) => Promise<string>;
	readonly clear: () => Promise<unknown>;
	/** Sets the goal again: a clear ends the user's `/goal`. */
	readonly setGoal: (condition: string) => Promise<unknown>;
	readonly submit: (text: string) => Promise<unknown>;
	/** Records the file as taken in, so a later resume does not inject it again. */
	readonly taken: (name: string) => Promise<unknown>;
	readonly abort: (turnId: string) => Promise<unknown>;
	readonly log: (line: string) => void;
	/** Runs `work` from a timer: `$.command.run` is queued until the session is idle, and it is not idle while the call waits. */
	readonly later: (work: () => Promise<void>) => void;
	/** What `git status -sb` prints, or nothing when git fails. */
	readonly gitStatus: () => Promise<string>;
}

/** One registration's state: whether a handoff runs, and the main loop's turn, which the tool ends. */
export interface CallState {
	handingOff: boolean;
	turn: string | undefined;
	/** The condition of the `/goal` the user set and has not cleared, from the `command.run` hook. */
	goal: string | undefined;
}

const restoreGoal = async (
	session: Session,
	goal: string | undefined,
): Promise<void> => {
	if (goal === undefined) {
		return;
	}
	try {
		await session.setGoal(goal);
	} catch (error) {
		session.log(
			`The session was cleared and its goal \`${goal}\` was not set again (${error})`,
		);
	}
};

const clearAndSubmit = async (
	session: Session,
	goal: string | undefined,
	name: string,
	text: string,
): Promise<void> => {
	try {
		await session.clear();
	} catch (error) {
		session.log(
			`The handoff is in \`${name}\`, and the clear failed (${error})`,
		);
		return;
	}
	try {
		await session.taken(name);
		await restoreGoal(session, goal);
		await session.submit(text);
	} catch (error) {
		session.log(
			`The session was cleared, and the handoff \`${name}\` was not sent (${error})`,
		);
	}
};

export const handOff = async (
	session: Session,
	state: CallState,
	input: Readonly<Record<string, unknown>>,
): Promise<string> => {
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
	let first: string;
	try {
		const text = await session.redact(
			toolHandoffText(read.fields, at.toISOString(), await session.gitStatus()),
		);
		await session.write(path, text);
		first = `${readBackText(name, text)}\n\n${await session.redact(read.fields.nextPrompt)}`;
	} catch (error) {
		return HANDOFF_UNSAVED(path, error);
	}
	state.handingOff = true;
	const { goal } = state;
	session.later(async () => {
		try {
			await clearAndSubmit(session, goal, name, first);
		} finally {
			state.handingOff = false;
		}
	});
	// Ending the turn spares the request that would read the whole context only to answer this result.
	if (state.turn !== undefined) {
		await session.abort(state.turn).catch((error: unknown) => {
			session.log(`The turn could not be ended after the handoff (${error})`);
		});
	}
	return `The handoff is saved to \`${path}\`. The session clears when this turn ends. End your turn.`;
};
