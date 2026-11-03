export const BUNDLED_SKILLS_KEY = "disableBundledSkills";

export const ENABLED_PLUGINS_KEY = "enabledPlugins";

/** The form `enabledPlugins` takes for built-in plugins, e.g. `cc-plugin-sec-default@builtin`. */
export const BUILTIN_MARKETPLACE = "builtin";

/** The registered name carries this prefix; the rows below leave it out. */
export const BUILTIN_PREFIX = "cc-plugin-";

export interface BuiltinPlugin {
	readonly name: string;
	readonly off: boolean;
	readonly why?: string;
}

/**
 * A `false` for a plugin that did not load costs nothing; some load only on certain entrypoints.
 * The `2.1.317` binary registers fourteen built-ins; `cc-plugin-privacy` is the one with no row, because a `false` for it moves the first request by 0 (`just capture --arm plain --settings FILE`).
 */
export const BUILTIN_PLUGINS: readonly BuiltinPlugin[] = [
	// Reads only policy and trusted settings, so writing `false` would claim an effect we cannot have.
	{
		name: "sec-default",
		off: false,
		why: "It declares `enabledFromTrustedSettingsOnly` and `enabledFromPolicyOnly`, so a user `false` does not decide it (`docs/gates.md:100`).",
	},
	{ name: "agents-md", off: true },
	{ name: "telemetry", off: true },
	{ name: "plugin-authoring", off: true },
	{ name: "mods-guide", off: true },
	{ name: "tips", off: true },
	{ name: "mermaid", off: true },
	{ name: "responsive-mode", off: true },
	{ name: "diff", off: true },
	{ name: "you-should-know", off: true },
	{ name: "easel", off: true },
	{ name: "claude-platform", off: true },
	{ name: "claude-test", off: true },
];

export const builtinId = (name: string): string =>
	`${BUILTIN_PREFIX}${name}@${BUILTIN_MARKETPLACE}`;

export const pluginsOff = (): readonly BuiltinPlugin[] =>
	BUILTIN_PLUGINS.filter((row) => row.off);

export const enabledPlugins = (): Readonly<Record<string, boolean>> =>
	Object.fromEntries(pluginsOff().map((row) => [builtinId(row.name), false]));

export interface BuiltinSnippet {
	readonly [BUNDLED_SKILLS_KEY]: true;
	readonly [ENABLED_PLUGINS_KEY]: Readonly<Record<string, boolean>>;
}

/** One object: the bundled-skill switch alone raises the request while `Workflow` is offered. */
export const builtinSnippet = (): BuiltinSnippet => ({
	[BUNDLED_SKILLS_KEY]: true,
	[ENABLED_PLUGINS_KEY]: enabledPlugins(),
});

export const BUILTIN_CHARS = 5590;
