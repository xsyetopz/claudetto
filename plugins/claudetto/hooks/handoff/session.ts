import type { EngineInterface, SessionMessage } from "claude-code";

import { redact } from "../secrets.ts";
import { readBackText, STALE_HANDOFF } from "../texts-handoff.ts";
import { atRoot, HANDOFF_DIR, handoffPath } from "./layout.ts";
import { DAY_MS, isStale, newestHandoff, readBackKey } from "./read-back.ts";
import {
	handoffText,
	humanPrompts,
	ownHandoffs,
	readMessages,
} from "./transcript.ts";

/** The returned call rejects when the secret scanner cannot run. */
export function redactOf(
	$: EngineInterface,
): (text: string) => Promise<string> {
	return (text) => redact((argv, init) => $.process.run(argv, init), text);
}

/** A dropped write is the one failure the user can act on, so it takes the visible sink. */
function notWritten($: EngineInterface, why: string, cause: string): void {
	$.ui.log(`No handoff was written (${why}): ${cause}`);
}

async function copyMisnamed(
	$: EngineInterface,
	misnamed: string,
	path: string,
): Promise<void> {
	try {
		const text = await $.fs.read(misnamed);
		await $.fs.write(atRoot(await $.session.root(), path), text);
		$.ui.log(
			`The handoff Claude wrote, \`${misnamed}\`, has a name the next session does not read, so it was copied to \`${path}\`.`,
		);
	} catch (error) {
		$.ui.log(
			`The handoff Claude wrote, \`${misnamed}\`, has a name the next session does not read, and the copy failed (${String(error)}).`,
		);
	}
}

async function promptsOf(
	$: EngineInterface,
	transcript: string | undefined,
): Promise<string[]> {
	try {
		return transcript === undefined
			? []
			: humanPrompts(await $.fs.read(transcript), (message) => {
					$.ui.log(message);
				});
	} catch (error) {
		$.ui.log(`The transcript was not read for prompts (${String(error)})`);
		return [];
	}
}

/** What `git status -sb` prints, or nothing when git fails. */
export async function gitStatusOf($: EngineInterface): Promise<string> {
	const r = await $.process
		.run(["git", "status", "-sb"])
		.catch((error: unknown) => {
			$.ui.log(`The git status call failed (${String(error)})`);
		});
	return r?.exitCode === 0 ? r.stdout : "";
}

/** Never throws: each failure is one `notWritten` line, because a hook that throws is skipped. */
export async function writeHandoff(
	$: EngineInterface,
	messages: readonly SessionMessage[],
	transcript: string | undefined,
	why: string,
): Promise<void> {
	try {
		const tail = readMessages(messages);
		const own = ownHandoffs(tail);
		if (own.valid) {
			return;
		}
		const at = new Date();
		const path = handoffPath(at);
		if (own.misnamed !== undefined) {
			await copyMisnamed($, own.misnamed, path);
			return;
		}
		const text = await redactOf($)(
			handoffText(
				tail,
				await promptsOf($, transcript),
				at.toISOString(),
				await gitStatusOf($),
			),
		);
		if (text !== "") {
			await $.fs.write(atRoot(await $.session.root(), path), text);
		}
	} catch (error) {
		notWritten($, why, String(error));
	}
}

async function mtimeOf($: EngineInterface, path: string): Promise<number> {
	const slash = path.lastIndexOf("/");
	const entries = await $.fs.list(path.slice(0, slash));
	return (
		entries.find((entry) => entry.name === path.slice(slash + 1))?.mtimeMs ?? 0
	);
}

/** The name goes to the store before the submit, so a second start of the same session finds it taken. A handoff older than the resumed transcript was written before that session's last turn, so the session holds its work already. */
export async function readBack(
	$: EngineInterface,
	resumed: string,
): Promise<void> {
	try {
		const root = await $.session.root();
		const dir = atRoot(root, HANDOFF_DIR);
		if (!(await $.fs.exists(dir))) {
			return;
		}
		const entries = await $.fs.list(dir);
		const name = newestHandoff(entries.map((entry) => entry.name));
		const key = readBackKey(root);
		if (name === undefined || name === (await $.store.get(key))) {
			return;
		}
		const written = entries.find((entry) => entry.name === name)?.mtimeMs ?? 0;
		if (written < (await mtimeOf($, resumed))) {
			return;
		}
		const ageMs = (await $.clock.now()) - written;
		await $.store.set(key, name);
		if (isStale(ageMs)) {
			$.ui.log(STALE_HANDOFF(name, Math.floor(ageMs / DAY_MS)));
			return;
		}
		const text = readBackText(
			name,
			await redactOf($)(await $.fs.read(`${dir}/${name}`)),
		);
		$.clock.after(0, () => {
			$.prompt.submit({ text }).catch((error: unknown) => {
				$.ui.log(`Failed to inject handoff ${name} (${String(error)})`);
			});
		});
	} catch (error) {
		$.ui.log(`Failed to read a handoff back (${String(error)})`);
	}
}
