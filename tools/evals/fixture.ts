// A `.tpl` suffix under `repo/` is dropped on copy, to keep the files out of this repo's lint and tests.

import { mkdir, readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { file as bunFile, write } from "bun";
import type { CommandRunner } from "../../claudekit/session/command.ts";

const TEMPLATE_SUFFIX = /\.tpl$/;

/** Passed per command so no global git config is read or written. */
const GIT_IDENTITY = [
	"-c",
	"user.name=eval",
	"-c",
	"user.email=eval@localhost",
	"-c",
	"commit.gpgsign=false",
];

export type Seeded =
	| {
			readonly kind: "seeded";
			readonly prompt: string;
			readonly grader: readonly string[];
	  }
	| { readonly kind: "failed"; readonly reason: string };

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
