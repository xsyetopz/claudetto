// The task state of an openspec change, read from the text of its `tasks.md`. No import, for the hooks module.

/** A task line: `- [ ] 1.1 text` or `- [x] 1.1 text`. Group 1 is the mark, and group 2 is the id. */
export const TASK_LINE = /^- \[([ xX])\] (\S+)/;

/** Each task line of `text`: its line, its index from 0, whether it is checked, its id, and the text after the mark. */
export const taskEntries = (text: string) =>
	text.split("\n").flatMap((line, index) => {
		const m = TASK_LINE.exec(line);
		return m
			? [
					{
						line,
						index,
						done: m[1] !== " ",
						id: m[2] ?? "",
						text: line.slice(6),
					},
				]
			: [];
	});

/** The next task is the first open task after the last checked task, or else the first open task. */
export const countTasks = (tasks: string) => {
	const doneIds: string[] = [];
	let total = 0;
	let first: string | null = null;
	let after: string | null = null;
	for (const { done, id } of taskEntries(tasks)) {
		total++;
		if (done) {
			doneIds.push(id);
			after = null;
		} else {
			first ??= id;
			after ??= id;
		}
	}
	return { done: doneIds.length, total, next: after ?? first, doneIds };
};

/** The change in progress: its name, its next open task, and the ids of its checked tasks (D48). */
export interface OpenChange {
	readonly name: string;
	readonly next: string;
	readonly done: readonly string[];
}

/** The text of `path`, or `null` when the read fails or gives no text. */
const readTasks = async (
	read: (path: string) => Promise<unknown>,
	path: string,
): Promise<string | null> => {
	try {
		const text = await read(path);
		return typeof text === "string" ? text : null;
	} catch {
		return null;
	}
};

/** The order of two names by code unit. */
const byName = (a: string, b: string): number => Number(a > b) - Number(a < b);

/** The changes in `dir` other than `archive`, at most `max`, each with the text of its `tasks.md`, or `null` when the read fails. The caller gives the reads as ports, because the mod runtime follows `$` into no imported arrow function. */
export const readChanges = async (
	dir: string,
	io: {
		list: (dir: string) => Promise<readonly { name: string; kind: string }[]>;
		read: (path: string) => Promise<unknown>;
	},
	max = Number.POSITIVE_INFINITY,
): Promise<{ name: string; tasks: string | null }[]> => {
	const entries = await io.list(dir).catch(() => []);
	return Promise.all(
		entries
			.filter((e) => e.kind === "dir" && e.name !== "archive")
			.slice(0, max)
			.map(async ({ name }) => ({
				name,
				tasks: await readTasks(io.read, `${dir}/${name}/tasks.md`),
			})),
	);
};

/** The first change by name that has an open task, from the names with the text of their `tasks.md` or `null`. */
export const openChange = (
	changes: readonly { readonly name: string; readonly tasks: string | null }[],
): OpenChange | null => {
	for (const { name, tasks } of [...changes].sort((a, b) =>
		byName(a.name, b.name),
	)) {
		const counts = tasks === null ? null : countTasks(tasks);
		if (counts?.next != null) {
			return { name, next: counts.next, done: counts.doneIds };
		}
	}
	return null;
};
