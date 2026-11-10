import { expect, test } from "bun:test";

import { file, which } from "bun";

import { GROUPS } from "../plugins/claudetto/hooks/setup/settings.ts";

const keysOf = (node: unknown): string[] => {
	if (typeof node !== "object" || node === null || Array.isArray(node)) {
		return [];
	}
	const keys: string[] = [];
	for (const [key, value] of Object.entries(node)) {
		keys.push(key, ...keysOf(value));
	}
	return keys;
};

// The binary names a built-in plugin without its `@builtin` marketplace.
const BUILTIN = /@builtin$/u;
const nameIn = (key: string): string => key.replace(BUILTIN, "");

test("every key a setup group writes is known to the installed Claude Code", async () => {
	const claude = which("claude");
	expect(claude).not.toBeNull();
	const binary = Buffer.from(await file(String(claude)).arrayBuffer());
	// `$schema` belongs to JSON Schema, not to Claude Code.
	const keys = GROUPS.flatMap((group) => keysOf(group.settings)).filter(
		(key) => key !== "$schema",
	);

	expect(keys.length).toBeGreaterThan(0);
	expect(keys.filter((key) => !binary.includes(nameIn(key)))).toEqual([]);
});

// A name alone is the fault: even `false` names a key setup has no reason to touch.
const REFUSED_KEYS = new Set([
	// Stops every hook, claudetto's own included.
	"disableAllHooks",
	// Stops the inline shell step that claudetto's skills use.
	"disableSkillShellExecution",
	// Rejects `--plugin-dir`, which the lab and the probes load the plugins with.
	"disableSideloadFlags",
	// Removes the plugin source that claudetto's commands come from.
	"disableCommandPluginSources",
	"DISABLE_LOGIN_COMMAND",
	"DISABLE_LOGOUT_COMMAND",
	// Removes `/doctor`, the first thing to run when the CLI itself is wrong.
	"DISABLE_DOCTOR_COMMAND",
	// Stops the updater, which would hold the user on one version.
	"DISABLE_AUTOUPDATER",
	"DISABLE_UPDATES",
	// Removes `/upgrade`, which changes the plan the budget is read against.
	"DISABLE_UPGRADE_COMMAND",
]);

test("no setup group names a refused key, in settings or in env", () => {
	const keys = GROUPS.flatMap((group) => keysOf(group.settings));

	expect(keys.filter((key) => REFUSED_KEYS.has(key))).toEqual([]);
});
