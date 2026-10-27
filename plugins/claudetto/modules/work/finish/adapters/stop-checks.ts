// The checks of a `Stop` of the `finish` slice: the open task of a loop, the missing check, and the note for the last reply.

import { passedChecks } from "../../../project/domain/checks.ts";
import type { Note } from "../../domain/notes.ts";
import {
	agentBusy,
	ranApply,
	tickedFiles,
	turnRows,
	unprovenTicks,
} from "../domain/record.ts";
import { wrongHeading } from "../domain/reply.ts";
import { nextOpen } from "../domain/tasks.ts";
import { projectChecks, uncheckedEdit } from "../domain/verify.ts";
import { HEADING_NOTE, UNPROVEN_NOTE } from "../prompts.ts";

const TRAILING_SLASHES = /\/+$/;

/** What the checks read of the session: the closures of `mod.ts`, so that `$` stays in the hook's own file. `raise` sets the note for `notes`. */
export interface Ports {
	messages: () => Promise<Parameters<typeof turnRows>[0]>;
	agents: () => Promise<Parameters<typeof agentBusy>[0]>;
	read: (file: string) => Promise<string>;
	exists: (file: string) => Promise<boolean>;
	root: () => Promise<string>;
	raise: (note: Note) => Promise<unknown>;
}

/** The first open task of `files`, read in order: a later file is read only when the earlier ones have none. */
const firstOpen = async (
	io: Ports,
	files: readonly string[],
): Promise<{ id: string; task: string } | null> => {
	const [file, ...rest] = files;
	if (file === undefined) {
		return null;
	}
	return nextOpen(await io.read(file)) ?? firstOpen(io, rest);
};

/** The next open task of the first `tasks.md` that the turn ticked and that has an open box, or `null` (also with no `/claudetto:apply`, with an agent in flight, or on a fault). */
export const openTask = async (
	io: Ports,
): Promise<{ id: string; task: string } | null> => {
	try {
		const messages = await io.messages();
		if (!ranApply(messages)) {
			return null;
		}
		const rows = turnRows(messages);
		const files = tickedFiles(rows);
		if (files.length === 0 || agentBusy(await io.agents())) {
			return null;
		}
		const open = await firstOpen(io, files);
		if (open !== null) {
			return open;
		}
	} catch {
		// A loop check is a help, so a fault of it adds no block.
	}
	return null;
};

/** The checks of the project when the turn edited a file that is not Markdown with no passed check after it, or `[]` (also on a fault). A stop that a hook blocked before has `stop_hook_active`, so the block comes one time. */
export const missingCheck = async (
	io: Ports,
	active: boolean | undefined,
): Promise<string[]> => {
	try {
		if (active || !uncheckedEdit(turnRows(await io.messages()))) {
			return [];
		}
		const root = (await io.root()).replace(TRAILING_SLASHES, "");
		const at = (file: string) => (root ? `${root}/${file}` : file);
		return projectChecks(
			await io.read(at("justfile")).catch(() => undefined),
			await io.exists(at("bun.lock")).catch(() => false),
		);
	} catch {
		// The check rule is a help, so a fault of it adds no block.
		return [];
	}
};

/** The note for the last reply: a ticked box with no passed check first, then a heading in the wrong case, or `null`. No rule reads the words of the reply. */
const noteOf = async (io: Ports, reply: string): Promise<Note | null> => {
	// A record that cannot be read shows no box, and the heading rule still runs.
	const messages = await io.messages().catch(() => []);
	const boxes = unprovenTicks(messages, passedChecks(messages));
	if (boxes.length > 0) {
		return UNPROVEN_NOTE({ boxes });
	}
	const heading = wrongHeading(reply);
	return heading && HEADING_NOTE(heading);
};

/** Sets the note for `reply`. A fault here never changes the stop. */
export const raiseNote = async (io: Ports, reply: string): Promise<void> => {
	try {
		const note = await noteOf(io, reply);
		if (note !== null) {
			await io.raise(note);
		}
	} catch {
		// A note is a help for the user, so a fault of it adds no block.
	}
};
