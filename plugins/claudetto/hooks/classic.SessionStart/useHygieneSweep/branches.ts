import { isRecord } from "../../tools.ts";
import { inOrder, type Run } from "./worktrees.ts";

const LINES = /\r?\n/u;

const linesOf = async (run: Run, dir: string, argv: readonly string[]) =>
	((await run(argv, dir)) ?? "").split(LINES).filter((line) => line !== "");

/** The branches some worktree of the checkout has checked out, the main one included. */
const checkedOut = async (run: Run, dir: string) => {
	const lines = await linesOf(run, dir, [
		"git",
		"worktree",
		"list",
		"--porcelain",
	]);
	return new Set(
		lines.flatMap((line) =>
			line.startsWith("branch refs/heads/") ? [line.slice(18)] : [],
		),
	);
};

/** The default branch as the ref to compare with and its name: `origin/HEAD` when set, `main` or `master` otherwise. */
const defaultBranch = async (run: Run, dir: string) => {
	const [head] = await linesOf(run, dir, [
		"git",
		"symbolic-ref",
		"--short",
		"refs/remotes/origin/HEAD",
	]);
	if (head !== undefined) {
		return { ref: head, name: head.replace(/^origin\//u, "") };
	}
	const [local] = await linesOf(run, dir, [
		"git",
		"branch",
		"--list",
		"main",
		"master",
		"--format=%(refname:short)",
	]);
	return local === undefined ? undefined : { ref: local, name: local };
};

/** Whether `git cherry` finds each commit of `tip` in `base`. */
const integrated = async (run: Run, dir: string, base: string, tip: string) => {
	const text = await run(["git", "cherry", base, tip], dir);
	return text !== undefined && !/^\+/mu.test(text);
};

/**
 * The local branches of the checkout at `dir` that nothing needs: not checked out in any worktree, not the default branch, with a newest commit older than `limitMs`,
 * and every commit found in the default branch by `git cherry`.
 */
export const freeBranches = async (
	run: Run,
	dir: string,
	now: number,
	limitMs: number,
): Promise<string[]> => {
	const [base, open, rows] = await Promise.all([
		defaultBranch(run, dir),
		checkedOut(run, dir),
		linesOf(run, dir, [
			"git",
			"for-each-ref",
			"--format=%(refname:short) %(committerdate:unix)",
			"refs/heads",
		]),
	]);
	if (base === undefined || limitMs <= 0) {
		return [];
	}
	const old = rows.flatMap((row) => {
		const [name = "", seconds = ""] = row.split(" ");
		return name !== base.name &&
			!open.has(name) &&
			now - Number(seconds) * 1000 > limitMs
			? [name]
			: [];
	});
	const judged = await inOrder(old, async (name) =>
		(await integrated(run, dir, base.ref, name)) ? [name] : [],
	);
	return judged.flat();
};

/** Deletes each of `names`. The branch needs `-D`, because a squashed or picked commit is no ancestor of the default branch; `git cherry` found each of its commits there. */
const deleteLocal = (run: Run, dir: string, names: readonly string[]) =>
	inOrder(names, async (name) => {
		await run(["git", "branch", "-D", name], dir);
	});

/** The pull requests of the GitHub repository behind `origin`, or `undefined` when `origin` is not on GitHub or `gh` gives no list. */
const pullRequests = async (run: Run, dir: string) => {
	const [url] = await linesOf(run, dir, ["git", "remote", "get-url", "origin"]);
	const slug = /github\.com[:/](.+?)(?:\.git)?$/u.exec(url ?? "")?.[1];
	const text =
		slug === undefined
			? undefined
			: await run(
					[
						"gh",
						"pr",
						"list",
						"--repo",
						slug,
						"--state",
						"all",
						"--limit",
						"300",
						"--json",
						"state,headRefName,headRefOid,isCrossRepository",
					],
					dir,
				);
	const prs: unknown = text === undefined ? undefined : JSON.parse(text);
	return Array.isArray(prs) ? prs.filter((pr) => isRecord(pr)) : undefined;
};

/** The `origin` branches of the checkout at `dir` that nothing needs, by the rule of `freeBranches` for the checkout and by GitHub's pull requests for the repository. */
export const freeRemoteBranches = async (
	run: Run,
	dir: string,
): Promise<string[]> => {
	const [base, open, heads, records] = await Promise.all([
		defaultBranch(run, dir),
		checkedOut(run, dir),
		linesOf(run, dir, ["git", "ls-remote", "--heads", "origin"]),
		pullRequests(run, dir),
	]);
	if (base === undefined || records === undefined) {
		return [];
	}
	const judged = await inOrder(heads, async (row) => {
		const [tip = "", ref = ""] = row.split(/\s+/u);
		const name = ref.replace(/^refs\/heads\//u, "");
		const named = records.filter((pr) => pr["headRefName"] === name);
		const merged = named.some(
			(pr) =>
				pr["state"] === "MERGED" &&
				pr["isCrossRepository"] === false &&
				pr["headRefOid"] === tip,
		);
		if (
			name === base.name ||
			open.has(name) ||
			named.some((pr) => pr["state"] === "OPEN")
		) {
			return [];
		}
		return merged || (await integrated(run, dir, base.ref, tip)) ? [name] : [];
	});
	return judged.flat();
};

/** The branch report of each project: the local branches that went, or would go in a dry run, and with `remote` the `origin` branches too, which only a run that is not a dry run deletes. */
export const branchReport = async (
	run: Run,
	dirs: readonly string[],
	options: {
		readonly dryRun: boolean;
		readonly remote: boolean;
		readonly now: number;
		readonly limitMs: number;
	},
): Promise<string> => {
	const lines = await inOrder([...new Set(dirs)], async (dir) => {
		const local = await freeBranches(run, dir, options.now, options.limitMs);
		const remote = options.remote ? await freeRemoteBranches(run, dir) : [];
		if (!options.dryRun) {
			await deleteLocal(run, dir, local);
			await inOrder(remote, async (name) => {
				await run(["git", "push", "origin", "--delete", name], dir);
			});
		}
		return [
			...local.map((name) => `local-branch  ${dir}  ${name}`),
			...remote.map((name) => `remote-branch  ${dir}  origin/${name}`),
		];
	});
	return [
		...lines.flat(),
		`hygiene ${options.dryRun ? "would delete" : "deleted"} ${lines.flat().length} branches.`,
	].join("\n");
};
