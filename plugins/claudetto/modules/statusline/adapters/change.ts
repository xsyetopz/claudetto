// The active openspec change: the task counts of `openspec/changes/<name>/tasks.md`.
// It is the first change by name with an open task, or else the first change. The `archive` folder is not a change.
import path from "node:path";
import { failureText } from "../../../kernel/node/hook-io.ts";
import type { FileReader } from "../../../kernel/ports.ts";
import { countTasks, openChange } from "../../project/domain/change.ts";
import { CHANGES_DIR } from "../../project/domain/paths.ts";
import type { Change } from "../types.ts";

export const changeOf = (name: string, tasks: string): Change => {
	const { done, total, next } = countTasks(tasks);
	if (total === 0) {
		return { name, state: "planning" };
	}
	return next === null
		? { name, state: "done", total }
		: { name, state: "open", done, total, next };
};

interface Probe {
	name: string;
	tasks?: string;
	planning?: boolean;
	failure?: { err: unknown };
}

/** The walk up from `at` to the first folder with a change: the folder `dir` of the changes, and its entry `names`. */
const findChanges = async (
	at: string,
	files: FileReader,
	failed: (err: unknown) => void,
): Promise<{ dir: string; names: string[] | undefined }> => {
	const dir = path.join(at, CHANGES_DIR);
	const names = await files.list(dir).catch((err): undefined => {
		failed(err);
	});
	return names?.length || path.dirname(at) === at
		? { dir, names }
		: findChanges(path.dirname(at), files, failed);
};

/** What the folder `name` holds: the text of `tasks.md`, or `planning` for a folder with only `proposal.md`, or the `failure` of a read. */
const probe = async (
	dir: string,
	name: string,
	files: FileReader,
): Promise<Probe> => {
	try {
		const tasks = await files.read(path.join(dir, name, "tasks.md"));
		if (tasks !== null) {
			return { name, tasks };
		}
		// A folder with neither `tasks.md` nor `proposal.md` is no change.
		const proposal = await files.read(path.join(dir, name, "proposal.md"));
		return proposal === null ? { name } : { name, planning: true };
	} catch (err) {
		return { name, failure: { err } };
	}
};

export const activeChange = async (
	root: string,
	files: FileReader,
	onError: (text: string) => void,
): Promise<Change | undefined> => {
	const failed = (err: unknown) => void onError(failureText(err));
	// The session folder can be below the project root, so walk up to the first folder with a change.
	const { dir, names } = await findChanges(root, files, failed);
	const probed = await Promise.all(
		(names ?? [])
			.filter((n) => n !== "archive")
			.sort()
			.map((name) => probe(dir, name, files)),
	);
	const changes: Change[] = [];
	const read: { name: string; tasks: string }[] = [];
	for (const { name, tasks, planning, failure } of probed) {
		if (failure) {
			failed(failure.err);
			changes.push({ name, state: "error" });
		} else if (tasks !== undefined) {
			read.push({ name, tasks });
			changes.push(changeOf(name, tasks));
		} else if (planning) {
			changes.push({ name, state: "planning" });
		}
	}
	const open = openChange(read);
	return changes.find((c) => c.name === open?.name) ?? changes[0];
};
