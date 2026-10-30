// A fixture folder is `<key>/prompt.txt` (the user's turn), `<key>/grade.ts` (the tree grader, a
// command), and `<key>/repo/` (the files of the scratch repository). A file under `repo/` that ends in
// `.tpl` is copied without that suffix: the suffix keeps the repository's own `.ts` and `.md` files
// out of the lint, the type check, and the test run of this repository.

import { mkdir, readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { file as bunFile, write } from "bun";
import type { CommandRunner } from "./command.ts";

const TEMPLATE_SUFFIX = /\.tpl$/;

/** The identity of the one seed commit, passed per command so no global git config is read or written. */
const GIT_IDENTITY = [
	"-c",
	"user.name=eval",
	"-c",
	"user.email=eval@localhost",
	"-c",
	"commit.gpgsign=false",
];

/** The result of seeding a fixture: the user's prompt and the grader argv when it worked, or the reason it did not. */
export type Seeded =
	| {
			readonly kind: "seeded";
			/** The user's turn for the session. */
			readonly prompt: string;
			/** The tree grader as an argv, to run in the scratch repository. */
			readonly grader: readonly string[];
	  }
	| { readonly kind: "failed"; readonly reason: string };

/** The keys that have a fixture folder with a `repo/` in it. A missing root holds none. */
export const seededKeys = async (
	root: string,
): Promise<ReadonlySet<string>> => {
	try {
		const entries = await readdir(root, { withFileTypes: true });
		const keys = await Promise.all(
			entries
				.filter((entry) => entry.isDirectory())
				.map(async (entry) => {
					const inner = await readdir(join(root, entry.name)).catch(
						(): string[] => [],
					);
					return inner.includes("repo") ? entry.name : undefined;
				}),
		);
		return new Set(keys.filter((key) => key !== undefined));
	} catch {
		return new Set();
	}
};

/** Copies the files of `<root>/<key>/repo` into `dest`, dropping the `.tpl` suffix. */
const copyRepo = async (source: string, dest: string): Promise<void> => {
	const entries = await readdir(source, {
		recursive: true,
		withFileTypes: true,
	});
	await Promise.all(
		entries
			.filter((entry) => entry.isFile())
			.map(async (entry) => {
				const from = join(entry.parentPath, entry.name);
				const to = join(
					dest,
					relative(source, from).replace(TEMPLATE_SUFFIX, ""),
				);
				await mkdir(dirname(to), { recursive: true });
				await write(to, bunFile(from));
			}),
	);
};

/** Runs the git commands that turn `dest` into a repository with one commit, or names the first that failed. */
const GIT_STEPS: readonly (readonly string[])[] = [
	["git", "init", "--quiet"],
	["git", "add", "--all"],
	["git", ...GIT_IDENTITY, "commit", "--quiet", "--message", "seed"],
];

/** Runs `steps` in order, because each needs the one before it, and stops at the first that fails. */
const initRepo = async (
	run: CommandRunner,
	dest: string,
	steps: readonly (readonly string[])[] = GIT_STEPS,
): Promise<string | undefined> => {
	const [argv, ...rest] = steps;
	if (argv === undefined) {
		return undefined;
	}
	const result = await run(argv, { cwd: dest });
	if (result.code !== 0) {
		return `\`${argv.slice(0, 2).join(" ")}\` failed: ${result.stderr.trim()}`;
	}
	return initRepo(run, dest, rest);
};

/** Seeds `dest` with the fixture of `key` and commits it, or says why it could not. */
export const seedFixture = async (
	run: CommandRunner,
	options: { root: string; key: string; dest: string },
): Promise<Seeded> => {
	const folder = join(options.root, options.key);
	const prompt = await bunFile(join(folder, "prompt.txt"))
		.text()
		.catch(() => undefined);
	if (prompt === undefined) {
		return { kind: "failed", reason: `no fixture for ${options.key}` };
	}
	await mkdir(options.dest, { recursive: true });
	await copyRepo(join(folder, "repo"), options.dest);
	const fault = await initRepo(run, options.dest);
	if (fault !== undefined) {
		return { kind: "failed", reason: fault };
	}
	return {
		kind: "seeded",
		prompt: prompt.trim(),
		grader: ["bun", join(folder, "grade.ts")],
	};
};
