// The project reads of the `handoff` slice: the project root, the open change, the written size of a file, and the handoff text.

import type { SessionMessage } from "claude-code";
import { openChange, readChanges } from "../../../project/domain/change.ts";
import { passedChecks, taskLines } from "../../../project/domain/checks.ts";
import { CHANGES_DIR } from "../../../project/domain/paths.ts";
import { projectRoot } from "../../../project/domain/session.ts";
import { sessionCost } from "../../domain/usage.ts";
import { groupOf, handoffText } from "../handover.ts";

/** The reads that the helpers make, as calls. The mod gives each call, because the mod runtime follows `$` into no imported arrow function. */
export interface Port {
	readonly projectDir: () => Promise<string | undefined>;
	readonly root: () => Promise<string>;
	readonly list: Parameters<typeof readChanges>[1]["list"];
	readonly read: Parameters<typeof readChanges>[1]["read"];
	readonly write: (path: string, text: string) => Promise<unknown>;
	readonly size: (path: string) => Promise<number>;
	readonly cost: Parameters<typeof sessionCost>[0];
}

const TRAILING_SLASHES = /\/+$/;

/** The project root with a final `/`, or `""` with no root (D23). */
export const rootOf = async (io: Port): Promise<string> => {
	const root = await projectRoot({
		dir: () => io.projectDir(),
		root: () => io.root(),
	});
	return root === "" ? "" : `${root.replace(TRAILING_SLASHES, "")}/`;
};

/** The open change among the folders of `openspec/changes/` (not `archive`), with the task lines of its `tasks.md`. */
export const openChangeOf = async (io: Port, root: string) => {
	const changes = await readChanges(`${root}${CHANGES_DIR}`, {
		list: (dir) => io.list(dir),
		read: (file) => io.read(file),
	});
	const change = openChange(changes);
	const tasks = changes.find((c) => c.name === change?.name)?.tasks ?? "";
	return { change, tasks, lines: taskLines(tasks) };
};

/** The size in bytes of the file after the write of `text` to `path`, or `0` when the write fails. */
export const writtenSize = async (io: Port, path: string, text: string) => {
	try {
		await io.write(path, text);
		return await io.size(path);
	} catch {
		return 0;
	}
};

/** The task group of the next open task of the open change, or `null` with no open change. */
export const groupNow = async (io: Port): Promise<string | null> => {
	const { change } = await openChangeOf(io, await rootOf(io));
	return groupOf(change?.next ?? null);
};

/** The cost report of the session: the cost, and the change of each share since the first reading. A fault gives `none`. */
const reportOf = (io: Port): Promise<string> => sessionCost(io.cost);

/** Writes the handoff text to `.claude/claudetto/handoffs/`, or gives `null` when the file is empty or missing. */
export const handoverOf = async (
	io: Port,
	messages: readonly SessionMessage[],
) => {
	const root = await rootOf(io);
	const { change, tasks } = await openChangeOf(io, root);
	const text = handoffText({
		messages,
		...(change === null ? {} : { name: change.name, tasks }),
		checks: passedChecks(messages),
		usage: await reportOf(io),
		root,
	});
	return { root, text };
};
