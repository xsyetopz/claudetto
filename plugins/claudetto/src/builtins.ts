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

/** A `false` for a plugin that did not load costs nothing; some load only on certain entrypoints. */
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

export const pluginsKept = (): readonly BuiltinPlugin[] =>
	BUILTIN_PLUGINS.filter((row) => !row.off);

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

export interface BuiltinReading {
	readonly settings: string;
	readonly total: number;
	readonly tools: number;
	readonly messages: number;
}

export const BUILTIN_CUTS: readonly BuiltinReading[] = [
	{ settings: "the defaults", total: 46_105, tools: 29_512, messages: 9984 },
	{
		settings: "`disableBundledSkills` alone",
		total: 57_134,
		tools: 46_467,
		messages: 4058,
	},
	{
		settings: "`disableBundledSkills` with the deny list",
		total: 27_758,
		tools: 17_091,
		messages: 4058,
	},
	{
		settings: "the shipped combination",
		total: 36_946,
		tools: 13_682,
		messages: 16_874,
	},
	{
		settings: "the shipped combination with the built-in plugins off",
		total: 36_678,
		tools: 13_682,
		messages: 16_606,
	},
	{
		settings: "the shipped combination with both switches",
		total: 31_356,
		tools: 13_682,
		messages: 11_284,
	},
];

export const BUILTIN_CHARS = 5590;

/** A switch that took claudetto's own skills would be a loss, not a cut. */
export const PLUGIN_SKILLS_SURVIVE = true;
