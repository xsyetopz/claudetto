import { join } from "node:path";

import { sleep } from "bun";

import { resultsOf } from "./relay.ts";
import type { LogRecord } from "./server.ts";

const SETTLE_MS = 1500;
const TURN_TIMEOUT_MS = 600_000;
const POLL_MS = 200;

const isLogRecord = (v: unknown): v is LogRecord =>
	typeof v === "object" &&
	v !== null &&
	"n" in v &&
	typeof v.n === "number" &&
	"host" in v &&
	typeof v.host === "string";

const parseRecord = (line: string): LogRecord => {
	const record: unknown = JSON.parse(line);
	if (!isLogRecord(record)) {
		throw new TypeError(`not a log record: ${line}`);
	}
	return record;
};

export const readLog = async (path: string): Promise<LogRecord[]> => {
	const text = await Bun.file(path).text();
	return text
		.split("\n")
		.filter((l) => l !== "")
		.map((l) => parseRecord(l));
};

/** Phase 2 runs only in an arm that restarts, so its file may not exist. */
export const streamOf = async (dir: string, phase: 1 | 2): Promise<string> => {
	const file = Bun.file(join(dir, `stream-${phase}.jsonl`));
	return (await file.exists()) ? file.text() : "";
};

export const resultsIn = (stream: string): number => resultsOf([stream]).length;

/** Checks `done` every `POLL_MS` until it holds or `TURN_TIMEOUT_MS` has passed. */
const pollUntil = async (
	done: () => Promise<boolean>,
	start = Date.now(),
): Promise<void> => {
	if ((await done()) || Date.now() - start >= TURN_TIMEOUT_MS) {
		return;
	}
	await sleep(POLL_MS);
	await pollUntil(done, start);
};

/** Waits for the turn's `result` line: a real turn can pause longer than the quiet period between its requests. */
export const finished = (
	dir: string,
	phase: 1 | 2,
	before: number,
): Promise<void> =>
	pollUntil(async () => resultsIn(await streamOf(dir, phase)) > before);

export const logSize = async (log: string): Promise<number> => {
	const records = await readLog(log);
	return records.length;
};

const untilQuiet = async (
	log: string,
	start: number,
	last: number,
	quietSince: number,
): Promise<void> => {
	if (
		Date.now() - quietSince >= SETTLE_MS ||
		Date.now() - start >= TURN_TIMEOUT_MS
	) {
		return;
	}
	await sleep(POLL_MS);
	const now = await logSize(log);
	await untilQuiet(log, start, now, now === last ? quietSince : Date.now());
};

/** Waits until the server log has been quiet for `SETTLE_MS`: a handover or a clear runs from a timer after the turn's result. */
export const settle = async (log: string): Promise<void> => {
	const now = Date.now();
	await untilQuiet(log, now, await logSize(log), now);
};
