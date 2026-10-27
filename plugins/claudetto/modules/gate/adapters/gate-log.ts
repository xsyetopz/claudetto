// The log of the session for each `ask` of the gate (task 5.2): a log that cannot be written changes no verdict.

import { isRecord } from "../domain/gate.ts";

/** What the log needs: the id of the session, the time of the host, and the file system. `mod.ts` builds it from `$`. */
export interface LogIo {
	id: () => Promise<string>;
	now: () => Promise<number>;
	exists: (path: string) => Promise<boolean>;
	read: (path: string) => Promise<string>;
	write: (path: string, text: string) => Promise<unknown>;
}

/** The call that an `ask` is for. */
export interface CheckEvent {
	tool: string;
	input: unknown;
}

/** The last write of the log. Each write waits for it, so two checks at the same time keep both lines. */
let logged: Promise<void> = Promise.resolve();

/** Who settled an `ask` of the gate: Jev, the classifier model, or a person. */
export type Decider = "jev" | "classifier" | "person";

const appendLog = async (
	previous: Promise<void>,
	io: LogIo,
	tmp: string,
	e: CheckEvent,
	reason: string,
	decider: Decider,
): Promise<void> => {
	await previous;
	try {
		const [id, at] = await Promise.all([io.id(), io.now()]);
		const path = `${tmp}/claudetto/gate/${id}.jsonl`;
		const old = (await io.exists(path)) ? await io.read(path) : "";
		const input = isRecord(e.input) ? e.input : {};
		const target = input["command"] ?? input["file_path"] ?? input["path"];
		const line = JSON.stringify({
			at: new Date(at).toISOString(),
			tool: e.tool,
			target: typeof target === "string" ? target : "",
			reason,
			decider,
		});
		await io.write(path, `${old}${line}\n`);
	} catch {
		// A log that cannot be written changes no verdict.
	}
};

export const log = (
	io: LogIo,
	tmp: string,
	e: CheckEvent,
	reason: string,
	decider: Decider,
): Promise<void> => {
	logged = appendLog(logged, io, tmp, e, reason, decider);
	return logged;
};
