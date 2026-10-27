// Each repository path in a code span of `src/wiki/` is a tracked file or folder, or a path that `.gitignore` covers.
// An ignored path is a file that Claude Code or claudetto writes at run time, such as `.claude/settings.local.json`.
// The test asks git, not the disk, so a local file that a clean checkout lacks does not pass.
// The pages of `evidence/` are out of scope, because they record the files of a past run.

import { expect, test } from "bun:test";
import path from "node:path";
import { file as bunFile, spawn } from "bun";
import { REPO, walk } from "../support/repo.ts";

const WIKI = path.join(REPO, "src", "wiki");
const ROOTED =
	/^(?:plugins|tests|tools|dev|src|schemas|openspec|\.claude|\.biome|\.github)\//;
// A placeholder, such as `<module>` or `*.ts`, names no single file.
const PLACEHOLDER = /[<>*{}$]/;
const SPAN = /`([^`\s]+)`/g;
const SUFFIX = /[:#].*$/;
const TRAILING_SLASH = /\/$/;
// Claude Code writes these folders, each with its own `.gitignore`, when a session loads a plugin from the checkout.
const WRITTEN_BY_CLAUDE_CODE = /^plugins\/[^/]+\/\.claude-plugin\/types\//;

/** The repository paths in the code spans of `text`, without a `:line` or `#anchor` suffix. */
const pathsOf = (text: string): string[] =>
	[...text.matchAll(SPAN)]
		.map((m) => (m[1] ?? "").replace(SUFFIX, ""))
		.filter((p) => ROOTED.test(p) && !PLACEHOLDER.test(p));

/** The output lines of `git args`, with `input` on stdin. Exit 1 of `check-ignore` means no match. */
const git = async (args: string[], input = ""): Promise<string[]> => {
	const r = spawn(["git", ...args], {
		cwd: REPO,
		stdin: new Blob([input]),
		stdout: "pipe",
	});
	const [stdout, exitCode] = await Promise.all([
		new Response(r.stdout).text(),
		r.exited,
	]);
	if (exitCode > 1) {
		throw new Error(`git ${args.join(" ")} exited ${exitCode}`);
	}
	return stdout.split("\n").filter(Boolean);
};

/** The paths of `named` that are neither tracked nor under a tracked folder, given the tracked `files`, nor ignored. */
const unknown = async (named: string[], files: string[]): Promise<string[]> => {
	const folders = new Set(
		files.flatMap((f) =>
			f
				.split("/")
				.slice(0, -1)
				.map((_, i, parts) => parts.slice(0, i + 1).join("/")),
		),
	);
	const untracked = named.filter((p) => {
		const bare = p.replace(TRAILING_SLASH, "");
		return !(
			files.includes(bare) ||
			folders.has(bare) ||
			WRITTEN_BY_CLAUDE_CODE.test(p)
		);
	});
	// A folder rule such as `/.claude/worktrees/` matches only a path with a trailing slash when the folder is absent.
	const asFolder = (p: string): string => `${p.replace(TRAILING_SLASH, "")}/`;
	const ignored = new Set(
		await git(
			["check-ignore", "--no-index", "--stdin"],
			untracked.flatMap((p) => [p, asFolder(p)]).join("\n"),
		),
	);
	return untracked.filter((p) => !(ignored.has(p) || ignored.has(asFolder(p))));
};

test("Wiki paths: each repository path in `src/wiki/` is tracked or ignored, outside `evidence/`", async () => {
	const pages = await walk(WIKI, {
		keep: (f) =>
			f.endsWith(".md") && !f.includes(`${path.sep}evidence${path.sep}`),
	});
	const texts = await Promise.all(pages.map((page) => bunFile(page).text()));
	const named = pages.flatMap((page, i) =>
		pathsOf(texts[i] ?? "").map((p) => ({ page, p })),
	);
	const bad = new Set(
		await unknown(
			named.map(({ p }) => p),
			await git(["ls-files"]),
		),
	);
	const missing = named
		.filter(({ p }) => bad.has(p))
		.map(({ page, p }) => `${path.relative(REPO, page)}: ${p}`);
	expect(missing).toStrictEqual([]);
});

test("Wiki paths: a rooted path counts, and a bare name or a placeholder does not", () => {
	const text =
		"See `plugins/claudetto/kernel/ports.ts:12`, `mod.ts`, `tests/claudetto/<module>/`, and `just check`.";
	expect(pathsOf(text)).toStrictEqual(["plugins/claudetto/kernel/ports.ts"]);
});

test("Wiki paths: a tracked file or folder and an ignored path pass, and an untracked, unignored path fails", async () => {
	const files = ["tools/limits.ts", "plugins/claudetto/kernel/ports.ts"];
	const named = [
		"tools/limits.ts",
		"plugins/claudetto/kernel/",
		".claude/settings.local.json",
		".claude/worktrees",
		"plugins/claudetto/.claude-plugin/types/tsconfig.json",
		"tools/gone.ts",
	];
	expect(await unknown(named, files)).toStrictEqual(["tools/gone.ts"]);
});
