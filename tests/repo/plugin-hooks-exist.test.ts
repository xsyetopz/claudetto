// Each file that a command hook of a `hooks.json` names exists in its plugin,
// and no `Stop` hook is an agent hook (V7, `live-checks.md` check 6).

import { expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { file as bunFile } from "bun";
import { PLUGINS } from "../support/repo.ts";

interface Hooks {
	hooks?: Record<string, { hooks: { type: string; command?: string }[] }[]>;
}

const ROOT_FILE = /\$\{CLAUDE_PLUGIN_ROOT\}\/([^\s"']+)/;

/** The plugin folders that have a `hooks/hooks.json`. */
const plugins = await readdir(PLUGINS);
const hasHooks = await Promise.all(
	plugins.map((name) =>
		bunFile(path.join(PLUGINS, name, "hooks/hooks.json")).exists(),
	),
);
const withHooks = plugins.filter((_, i) => hasHooks[i]);

test("there are plugins with a `hooks.json`", () => {
	expect(withHooks.length).toBeGreaterThan(0);
});

test.each(withHooks)(
	"each file that a command hook of %s names exists",
	async (name) => {
		const dir = path.join(PLUGINS, name);
		const config: Hooks = await bunFile(
			path.join(dir, "hooks/hooks.json"),
		).json();
		const commands = Object.values(config.hooks ?? {})
			.flat()
			.flatMap((group) => group.hooks)
			.filter((hook) => hook.type === "command");
		await Promise.all(
			commands.map(async (hook) => {
				const rel = ROOT_FILE.exec(hook.command ?? "")?.[1];
				expect(rel, hook.command).toBeDefined();
				expect(await bunFile(path.join(dir, rel ?? "")).exists(), rel).toBe(
					true,
				);
			}),
		);
	},
);

// The result of a `-p` run does not count the model call of a `Stop` agent hook
// in `total_cost_usd` or `modelUsage`, so an eval cannot see its cost.
test.each(withHooks)("no `Stop` hook of %s is an agent hook", async (name) => {
	const config: Hooks = await bunFile(
		path.join(PLUGINS, name, "hooks/hooks.json"),
	).json();
	const types = (config.hooks?.["Stop"] ?? [])
		.flatMap((group) => group.hooks)
		.map((hook) => hook.type);
	expect(types).not.toContain("agent");
});
