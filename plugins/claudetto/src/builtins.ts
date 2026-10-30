// The two documented switches that remove Claude Code's own built-in surface: the bundled skills and
// workflows, and the built-in plugins. They sit together because they are one lever in practice. The
// bundled-skill listing and the `cc-plugin-claude-platform` skill overlap, so turning off only one of
// them leaves the other's entry in the request, which the readings below measure.
//
// A `chunk-...js:offset` below is a pointer for a reader and never a check. The chunk name is
// content-addressed and moves inside one version, so a check reads the vendored settings schema
// instead (`tools/settings-schema.ts`).

/** The settings key that removes the skills and workflows that ship inside Claude Code. */
export const BUNDLED_SKILLS_KEY = "disableBundledSkills";

/** The settings key that turns an individual plugin on or off. */
export const ENABLED_PLUGINS_KEY = "enabledPlugins";

/**
 * The marketplace suffix a built-in plugin's id carries. `chunk-0gsajprh.js:11133` holds the literal
 * `cc-plugin-sec-default@builtin`, which is the form `enabledPlugins` takes for these.
 */
export const BUILTIN_MARKETPLACE = "builtin";

/**
 * The prefix the registered name carries, which the id needs and the rows below leave out.
 * `chunk-ey5hx8vw.js:13093` holds the map from the short name to the registered one, as
 * `[["responsive-mode","cc-plugin-responsive-mode"],["tips","cc-plugin-tips"], ...]`, so a row's
 * `name` is the key of that map and the id is built from its value.
 */
export const BUILTIN_PREFIX = "cc-plugin-";

/** One built-in plugin of Claude Code, with whether claudetto turns it off and why when it does not. */
export interface BuiltinPlugin {
	/** The plugin's own name, without the marketplace suffix. */
	readonly name: string;
	/** Whether claudetto writes `false` for it. */
	readonly off: boolean;
	/** Why claudetto leaves it alone, for a row that it does not turn off. */
	readonly why?: string;
}

/**
 * Every built-in plugin the installed program registers, in the order `chunk-ve0ysyqt.js` calls
 * `xme("cc-plugin-<name>", ...)` from offset 484 to 1728. Some calls are conditional on the
 * entrypoint, so a session need not load all thirteen, and a `false` for one that did not load costs
 * nothing.
 *
 * Why turn them off: G13 of `openspec/changes/claudetto-restart/prd.md` is CLI and TUI only, and
 * these carry claude.ai, Cowork, and telemetry surface that a coding session does not use.
 * `cc-plugin-you-should-know` is off for a second reason: `plugins/claudetto-you-should-know/`
 * rebuilds it, so the built-in would duplicate a plugin this repo ships.
 */
export const BUILTIN_PLUGINS: readonly BuiltinPlugin[] = [
	// `docs/gates.md:100` read `enabledFromTrustedSettingsOnly:!0,enabledFromPolicyOnly:!0` on this one
	// alone, and `chunk-ey5hx8vw.js:75096` holds its name as a constant of its own. Those two flags
	// make it read the policy and trusted sources only, so a `false` from the user's settings is not
	// what decides it, and writing one would claim an effect we cannot have.
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

/** The id `enabledPlugins` takes for a built-in plugin, which is its registered name and the `builtin` marketplace. */
export const builtinId = (name: string): string =>
	`${BUILTIN_PREFIX}${name}@${BUILTIN_MARKETPLACE}`;

/** The built-in plugins claudetto turns off, which is every row but `sec-default`. */
export const pluginsOff = (): readonly BuiltinPlugin[] =>
	BUILTIN_PLUGINS.filter((row) => row.off);

/** The built-in plugins claudetto leaves alone, each carrying the reason. */
export const pluginsKept = (): readonly BuiltinPlugin[] =>
	BUILTIN_PLUGINS.filter((row) => !row.off);

/** The `enabledPlugins` block claudetto writes: one `false` per built-in plugin it turns off. */
export const enabledPlugins = (): Readonly<Record<string, boolean>> =>
	Object.fromEntries(pluginsOff().map((row) => [builtinId(row.name), false]));

/** The settings claudetto writes to remove the built-in surface: the bundled-skill switch and the plugin block. */
export interface BuiltinSnippet {
	readonly [BUNDLED_SKILLS_KEY]: true;
	readonly [ENABLED_PLUGINS_KEY]: Readonly<Record<string, boolean>>;
}

/**
 * Both switches as one object, because neither is a lever on its own in the shipped tree: the
 * readings of `BUILTIN_CUTS` show the bundled-skill switch raising the request by 11,379 characters
 * when `Workflow` is still offered, and the plugin block paying 69 characters more once the bundled
 * listing is gone.
 */
export const builtinSnippet = (): BuiltinSnippet => ({
	[BUNDLED_SKILLS_KEY]: true,
	[ENABLED_PLUGINS_KEY]: enabledPlugins(),
});

/** One capture of these switches, with what the arm read and what the row settles. */
export interface BuiltinReading {
	/** The settings of the run, in words. */
	readonly settings: string;
	/** The whole first request, in characters. */
	readonly total: number;
	/** The `tools` characters of that run. */
	readonly tools: number;
	/** The `messages` characters of that run. */
	readonly messages: number;
}

/**
 * The readings that decided both switches, each one `bun tools/capture/run.ts` of 2026-10-30 against
 * the fake Messages API, so no provider was reached and no model call was billed.
 *
 * The first three rows are the `plain` arm and the last three the shipped `plugin` arm. What they
 * settle, in order: the bundled-skill switch alone is a loss, because `Workflow` inlines the workflow
 * guidance its listing no longer carries and `tools` grows 28,187 to 45,142 against a 5,576 fall in
 * `messages`; with `Workflow` denied that growth has nowhere to land, so `tools` is byte-identical at
 * 16,021 and the whole 5,576 is kept; and in the shipped arm the two switches together take 5,913,
 * which is 337 for the plugin block against the 268 it takes alone, because
 * `cc-plugin-claude-platform` offers its own `/claude-api` only while no bundled skill holds that
 * name (`clawdipedia` route `extend/skills-and-commands/bundled-skills`).
 */
export const BUILTIN_CUTS: readonly BuiltinReading[] = [
	{ settings: "the defaults", total: 42_879, tools: 28_187, messages: 8061 },
	{
		settings: "`disableBundledSkills` alone",
		total: 54_258,
		tools: 45_142,
		messages: 2485,
	},
	{
		settings: "`disableBundledSkills` with the deny list",
		total: 25_137,
		tools: 16_021,
		messages: 2485,
	},
	{
		settings: "the shipped combination",
		total: 30_291,
		tools: 12_850,
		messages: 11_029,
	},
	{
		settings: "the shipped combination with the built-in plugins off",
		total: 30_023,
		tools: 12_850,
		messages: 10_761,
	},
	{
		settings: "the shipped combination with both switches",
		total: 24_378,
		tools: 12_850,
		messages: 5116,
	},
];

/**
 * The characters the two switches take off the shipped first request, read as the difference between
 * the last row of `BUILTIN_CUTS` and the row with neither switch. Every character of it leaves
 * `messages`: `tools` holds at 12,850 and `system` at 5,708 across all three shipped rows.
 */
export const BUILTIN_CHARS = 5913;

/**
 * Whether a plugin skill survives the bundled-skill switch, which is the capability question, because
 * claudetto ships its own skills and a switch that took them too would be a loss and not a cut.
 *
 * Measured on 2026-10-30 by running the installed claudetto, which ships ten skills,
 * against the fake Messages API with and without the key: `claudetto:dedupe` and `claudetto:find-docs`
 * are listed in both arms, the two of the ten that the model may call, while every bundled name left.
 * The request fell 38,707 to 33,131, the same 5,576 as the other two arms read.
 */
export const PLUGIN_SKILLS_SURVIVE = true;
