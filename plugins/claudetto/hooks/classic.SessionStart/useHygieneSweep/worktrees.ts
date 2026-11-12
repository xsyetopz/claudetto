import { isRecord } from "../../tools.ts";

/** Runs a command in `cwd` and answers its stdout when it exits 0. */
export type Run = (
	argv: readonly string[],
	cwd: string,
) => Promise<string | undefined>;

interface Free {
	readonly path: string;
	readonly branch: string | undefined;
}

interface Kept {
	readonly path: string;
	readonly why: string;
}

// Claude Code names an agent's worktree `agent-a` and 16 or 7 hex digits.
const AGENT = /\/\.claude\/worktrees\/agent-a(?:[0-9a-f]{16}|[0-9a-f]{7})$/u;

/** The results of `step` on each item, one call finishing before the next starts, because git locks its metadata while it removes a worktree or a branch. */
export const inOrder = async <T, R>(
	items: readonly T[],
	step: (item: T) => Promise<R>,
): Promise<R[]> => {
	const [head, ...rest] = items;
	return head === undefined
		? []
		: [await step(head), ...(await inOrder(rest, step))];
};

/** The project paths Claude Code keeps as the `projects` keys of its global config file. */
export const projectsOf = (text: string): string[] => {
	const config: unknown = JSON.parse(text);
	const projects = isRecord(config) ? config["projects"] : undefined;
	return isRecord(projects) ? Object.keys(projects) : [];
};

/**
 * The agent worktrees of the checkout at `dir` whose folder is there and that git lists without a lock, which Claude Code holds while the agent runs. A `free` one holds no
 * uncommitted change and only commits that `git cherry` finds in the current branch of `dir`; a `kept` one holds work that is nowhere else.
 */
export const agentWorktrees = async (
	run: Run,
	dir: string,
): Promise<{ free: Free[]; kept: Kept[] }> => {
	const list =
		(await run(["git", "worktree", "list", "--porcelain"], dir)) ?? "";
	const open = list.split("\n\n").flatMap((block) => {
		const path = /^worktree (.+)$/mu.exec(block)?.[1] ?? "";
		const head = /^HEAD (.+)$/mu.exec(block)?.[1];
		// Git marks a record `prunable` when its folder is gone, and `git gc` drops such a record.
		return AGENT.test(path) &&
			head !== undefined &&
			!/^(?:locked|prunable)/mu.test(block)
			? [
					{
						path,
						head,
						branch: /^branch refs\/heads\/(.+)$/mu.exec(block)?.[1],
					},
				]
			: [];
	});
	const judged = await inOrder(
		open,
		async ({ path, head, branch }): Promise<Free | Kept> => {
			const ahead = await run(["git", "cherry", "HEAD", head], dir);
			if (ahead === undefined || /^\+/mu.test(ahead)) {
				return {
					path,
					why:
						ahead === undefined
							? "could not be compared with the current branch"
							: "holds a commit the current branch lacks",
				};
			}
			return (await run(["git", "status", "--porcelain"], path)) === ""
				? { path, branch }
				: { path, why: "holds uncommitted changes" };
		},
	);
	return {
		free: judged.flatMap((item) => ("why" in item ? [] : [item])),
		kept: judged.flatMap((item) => ("why" in item ? [item] : [])),
	};
};

/** Removes each free worktree and then its branch, and answers the paths git kept. The branch needs `-D`, because a picked commit is no ancestor of the current branch; `git cherry` found each of its commits there. */
export const removeWorktrees = async (
	run: Run,
	dir: string,
	free: readonly Free[],
): Promise<string[]> => {
	const stayed = await inOrder(free, async ({ path, branch }) => {
		if ((await run(["git", "worktree", "remove", path], dir)) === undefined) {
			return [path];
		}
		if (branch !== undefined) {
			await run(["git", "branch", "-D", branch], dir);
		}
		return [];
	});
	return stayed.flat();
};

/** The report of the agent worktrees of each project: the ones that went, or would go in a dry run, and the unlocked ones that stay, each with its bytes. */
export const worktreeReport = async (
	run: Run,
	dirs: readonly string[],
	dryRun: boolean,
): Promise<string> => {
	let count = 0;
	let freed = 0;
	const lines = await inOrder([...new Set(dirs)], async (dir) => {
		const { free, kept } = await agentWorktrees(run, dir);
		const paths = [...free, ...kept].map((item) => item.path);
		const sizes =
			paths.length > 0 ? await run(["du", "-sk", ...paths], dir) : "";
		const bytes = new Map(
			(sizes ?? "").split("\n").map((line): [string, number] => {
				const [kb = "", path = ""] = line.split("\t");
				return [path, Number(kb) * 1024];
			}),
		);
		const stayed = dryRun ? [] : await removeWorktrees(run, dir, free);
		const all = [
			...free.map((item) => ({
				path: item.path,
				why: stayed.includes(item.path) ? "was not removed by git" : "",
			})),
			...kept,
		];
		return all.map(({ path, why }) => {
			const size = bytes.get(path) ?? 0;
			if (why === "") {
				count += 1;
				freed += size;
			}
			return why === ""
				? `agent-worktree  ${path}  ${size} B`
				: `kept-worktree  ${path}  ${size} B  ${why}`;
		});
	});
	return [
		...lines.flat(),
		`hygiene ${dryRun ? "would remove" : "removed"} ${count} agent worktrees, ${freed} B.`,
	].join("\n");
};
