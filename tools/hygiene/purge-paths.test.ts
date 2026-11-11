import { expect, test } from "bun:test";
import { mkdir, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { $ } from "bun";

import { parseArgs } from "../../plugins/claudetto/hooks/hygiene/args.ts";
import { sweep } from "../../plugins/claudetto/hooks/hygiene/sweep.ts";
import { tempDir } from "../temp.mock.ts";

const DAY = 86_400_000;
const NOW = Date.now();
const OLD = new Date(NOW - 10 * DAY);
const logged: string[] = [];

/** A checkout at `dir` that ignores `node_modules/`, holding one that is, like its index, 10 days old. */
const idleCheckout = async (dir: string) => {
	await mkdir(join(dir, "node_modules/pkg"), { recursive: true });
	await writeFile(join(dir, ".gitignore"), "node_modules/\n");
	await $`git init -q && git add .gitignore`.cwd(dir).quiet();
	await Promise.all(
		["node_modules/pkg", "node_modules", ".git/index"].map((p) =>
			utimes(join(dir, p), OLD, OLD),
		),
	);
};

/** A session project and a home folder whose Mole `purge_paths` holds `listed`. */
const world = async (listed?: (root: string) => string) => {
	const root = await tempDir("purge-");
	const home = join(root, "home");
	const proj = join(root, "proj");
	await mkdir(proj, { recursive: true });
	await mkdir(join(home, ".config/mole"), { recursive: true });
	await $`git init -q`.cwd(proj).quiet();
	if (listed) {
		await writeFile(
			join(home, ".config/mole/purge_paths"),
			`# Mole Purge Paths\n\n${listed(root)}\n`,
		);
	}
	const removed = async (projects: string[] = []) => {
		const report = await sweep(parseArgs(["--dry-run"]), {
			cwd: proj,
			projects,
			home,
			now: NOW,
			uid: process.getuid?.() ?? 0,
			days: 30,
			tempBases: [],
			configDir: join(home, ".claude"),
			log: (line) => logged.push(line),
		});
		return report.removed.map((item) => item.path);
	};
	return { root, home, removed };
};

test("an old build folder in an idle checkout under a Mole purge path is swept", async () => {
	const { root, removed } = await world((r) => join(r, "work"));
	await idleCheckout(join(root, "work/other"));
	expect(await removed()).toEqual([join(root, "work/other/node_modules")]);
});

test("a purge path written with ~ is read from the home folder", async () => {
	const { home, removed } = await world(() => "~/code");
	await idleCheckout(join(home, "code/other"));
	expect(await removed()).toEqual([join(home, "code/other/node_modules")]);
});

test("with no purge_paths file another checkout is not walked", async () => {
	const { root, removed } = await world();
	await idleCheckout(join(root, "work/other"));
	expect(await removed()).toEqual([]);
});

test("an old build folder in an idle checkout that Claude Code lists is swept", async () => {
	const { root, removed } = await world();
	const other = join(root, "work/other");
	await idleCheckout(other);
	expect(await removed([other, join(root, "gone")])).toEqual([
		join(other, "node_modules"),
	]);
});

test("a listed project that is the home folder is not walked", async () => {
	const { home, removed } = await world();
	await idleCheckout(join(home, "code/other"));
	expect(await removed([home])).toEqual([]);
});

test("the walk skips ~/.claude/plugins and ~/.claude/projects inside a purge path", async () => {
	const { home, removed } = await world(() => "~/.claude");
	await idleCheckout(join(home, ".claude/plugins/marketplaces/m"));
	await idleCheckout(join(home, ".claude/projects/p"));
	expect(await removed()).toEqual([]);
});
