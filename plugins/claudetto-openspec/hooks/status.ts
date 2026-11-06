import { type Fs, join } from "./fs.ts";
import { scanTasks } from "./tasks.ts";
import { changeDir } from "./validate.ts";

const ARTIFACTS = ["proposal.md", "design.md", "specs", "tasks.md"];

export interface Progress {
	artifacts: string[];
	done: number;
	open: { line: number; text: string }[];
}

export const activeChanges = async (fs: Fs, root: string) => {
	const dir = join(root, "openspec", "changes");
	if (!(await fs.exists(dir))) {
		return;
	}
	return (await fs.list(dir))
		.filter((e) => e.kind === "dir" && e.name !== "archive")
		.map((e) => e.name)
		.filter((n) => !n.startsWith("."))
		.sort();
};

export const progress = async (
	fs: Fs,
	root: string,
	name: string,
): Promise<Progress> => {
	const dir = changeDir(root, name);
	const present = await Promise.all(
		ARTIFACTS.map((a) => fs.exists(join(dir, a))),
	);
	const artifacts = ARTIFACTS.filter((_, i) => present[i]).map((a) =>
		a.replace(".md", ""),
	);
	const file = join(dir, "tasks.md");
	const text = (await fs.exists(file)) ? await fs.read(file) : "";
	return { artifacts, ...scanTasks(text) };
};
