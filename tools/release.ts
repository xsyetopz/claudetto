// Tags each plugin of `plugins/` at HEAD and pushes all tags in one atomic push (`just release`).
// Before the first tag, it checks the tree, the generated files, and the tag names, and it stops when one fails.
// If a tag step or the push fails, it deletes the tags that it made.
// With `--dry-run`, it prints the tags and stops.
// Any other argument stops it before the first command, so a mistyped dry run cannot make or push a tag.

import { $, argv } from "bun";
import { makeTags, type Plan, preflight } from "./preflight.ts";
import { must, output, pluginDirs, REPO, recipe } from "./recipes.ts";
import { $claude } from "./telemetry.ts";

/** True when `bun tools/generate/index.ts --check` (`just generate --check`) passes. */
const generatedOk = async (): Promise<boolean> =>
	(await $`bun tools/generate/index.ts --check`.cwd(REPO).nothrow())
		.exitCode === 0;

const TAG_LINE = /^Tag:\s+(\S+)/m;

const USAGE = "Usage: bun tools/release.ts [--dry-run]";

/** True for `--dry-run`, false for no argument, and null for any other argument list. */
export const dryRunOf = (args: string[]): boolean | null => {
	if (args.length === 0) {
		return false;
	}
	return args.length === 1 && args[0] === "--dry-run" ? true : null;
};

const release = async (dryRun: boolean): Promise<void> => {
	// A plugin with no `Tag:` line stops the run before the next dry run.
	const planFrom = async (
		dirs: string[],
		done: Plan[],
	): Promise<Plan[] | null> => {
		const [dir, ...rest] = dirs;
		if (dir === undefined) {
			return done;
		}
		const out = await output($claude()`claude plugin tag --dry-run ${dir}`);
		const tag = out.match(TAG_LINE)?.[1];
		if (!tag) {
			console.error(
				`\`claude plugin tag --dry-run ${dir}\` printed no \`Tag:\` line.`,
			);
			return null;
		}
		return planFrom(rest, [...done, { dir, tag }]);
	};
	const plans = await planFrom(await pluginDirs(), []);
	if (plans === null) {
		process.exitCode = 1;
		return;
	}
	const tags = plans.map((plan) => plan.tag);
	const problems = await preflight({ root: REPO, tags, generatedOk });
	if (problems.length > 0) {
		for (const problem of problems) {
			console.error(problem);
		}
		process.exitCode = 1;
		return;
	}
	process.stdout.write(`Tags: ${tags.join(" ")}\n`);
	if (dryRun) {
		return;
	}
	await makeTags(
		REPO,
		plans,
		async (dir) => {
			await must($claude()`claude plugin tag ${dir}`);
		},
		async () => {
			await must(
				$`git push --atomic origin ${tags.map((t) => `refs/tags/${t}`)}`,
			);
		},
	);
};

if (import.meta.main) {
	const dryRun = dryRunOf(argv.slice(2));
	if (dryRun === null) {
		console.error(USAGE);
		process.exitCode = 2;
	} else {
		await recipe(() => release(dryRun));
	}
}
