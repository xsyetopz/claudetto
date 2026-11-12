import { open } from "node:fs/promises";
import { join } from "node:path";

import { heartbeatPath } from "../hooks/session.measure/useLineFile/heartbeat";
import { num, type Rec, str, sub } from "./input";

/**
 * A choice: the margin between the heartbeat and a newer reply before the line warns. The heartbeat is written at a
 * request's start and stop, and the reply entry lands between them, so a live session stays well inside it.
 */
const HOOKS_OFF_MS = 5 * 60_000;

/** A choice that bounds the read per refresh; an entry longer than the tail is skipped, which leaves the line quiet. */
const TAIL_CAP = 256 * 1024;
const BEAT_CAP = 64;

const TIMESTAMP = /"timestamp":"([^"]+)"/u;

const readTail = async (
	path: string,
	cap: number,
): Promise<string | undefined> => {
	try {
		await using handle = await open(path, "r");
		const { size } = await handle.stat();
		const start = Math.max(0, size - cap);
		const buffer = Buffer.alloc(size - start);
		const { bytesRead } = await handle.read(buffer, 0, buffer.length, start);
		const text = buffer.toString("utf8", 0, bytesRead);
		return start === 0 ? text : text.slice(text.indexOf("\n") + 1);
	} catch {
		return undefined;
	}
};

/** The time of the newest assistant entry: a model request comes before each, and `turn.step` fires for each request. */
const lastReplyAt = (tail: string): number | undefined => {
	let last: number | undefined;
	for (const line of tail.split("\n")) {
		const at = line.includes('"type":"assistant"')
			? Date.parse(TIMESTAMP.exec(line)?.[1] ?? "")
			: Number.NaN;
		if (Number.isFinite(at) && (last === undefined || at > last)) {
			last = at;
		}
	}
	return last;
};

/**
 * Whether claudetto's hooks stopped while the session went on: a reply newer than the heartbeat by more than the
 * margin, or, with no heartbeat at all, a reply more than the margin into the session. Any part that cannot be read
 * answers `false`, so the line never warns on a guess.
 */
export const hooksOff = async (
	input: Rec,
	project: string,
	now: number,
): Promise<boolean> => {
	const session = str(input["session_id"]);
	const transcript = str(input["transcript_path"]);
	if (session === undefined || transcript === undefined) {
		return false;
	}
	const [tail, beatText] = await Promise.all([
		readTail(transcript, TAIL_CAP),
		readTail(join(project, heartbeatPath(session)), BEAT_CAP),
	]);
	const reply = tail === undefined ? undefined : lastReplyAt(tail);
	if (reply === undefined) {
		return false;
	}
	const beat = beatText?.trim() === "" ? Number.NaN : Number(beatText);
	if (Number.isFinite(beat)) {
		return reply - beat > HOOKS_OFF_MS;
	}
	const ran = num(sub(input, "cost")?.["total_duration_ms"]);
	return ran !== undefined && reply - (now - ran) > HOOKS_OFF_MS;
};
