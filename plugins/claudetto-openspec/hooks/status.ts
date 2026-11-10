import { type Fs, join } from "./fs.ts";
import { scanTasks } from "./tasks.ts";
import { changeDir } from "./validate.ts";

// Each artifact turns ready once every one it needs is done.
const ARTIFACTS = [
	{ name: "proposal", file: "proposal.md", needs: [] },
	{ name: "specs", file: "specs", needs: ["proposal"] },
	{ name: "design", file: "design.md", needs: ["proposal"] },
	{ name: "tasks", file: "tasks.md", needs: ["specs", "design"] },
];

export interface Progress {
	artifacts: string[];
	done: number;
	open: { line: number; text: string }[];
}

const dirsIn = async (fs: Fs, dir: string) =>
	(await fs.list(dir))
		.filter((e) => e.kind === "dir" && !e.name.startsWith("."))
		.map((e) => e.name)
		.sort();

export const activeChanges = async (fs: Fs, root: string) => {
	const dir = join(root, "openspec", "changes");
	if (!(await fs.exists(dir))) {
		return;
	}
	return (await dirsIn(fs, dir)).filter((n) => n !== "archive");
};

export const archivedChanges = async (fs: Fs, root: string) => {
	const dir = join(root, "openspec", "changes", "archive");
	return (await fs.exists(dir)) ? dirsIn(fs, dir) : [];
};

export const progress = async (
	fs: Fs,
	root: string,
	name: string,
): Promise<Progress> => {
	const dir = changeDir(root, name);
	const present = await Promise.all(
		ARTIFACTS.map((a) => fs.exists(join(dir, a.file))),
	);
	const done = new Set(
		ARTIFACTS.filter((_, i) => present[i]).map((a) => a.name),
	);
	const artifacts = ARTIFACTS.map((a) => {
		if (done.has(a.name)) {
			return `${a.name} done`;
		}
		return `${a.name} ${a.needs.every((n) => done.has(n)) ? "ready" : "blocked"}`;
	});
	const file = join(dir, "tasks.md");
	const text = (await fs.exists(file)) ? await fs.read(file) : "";
	return { artifacts, ...scanTasks(text) };
};
