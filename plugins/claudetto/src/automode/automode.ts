import { ENV, type Kind, SETTING } from "../keys.ts";
import { settingsFileIn } from "../settings-file.ts";
import { environmentEntries } from "./environment.ts";

/** User settings only: the program reads `autoMode` from user, `--settings`, and managed settings. */
export const AUTO_MODE_TARGET = "user";

export const autoModeTargetFile = (configDir: string): string =>
	settingsFileIn(configDir);

export const DEFAULTS = "$defaults";

export const AUTO_MODE_LISTS = [
	"allow",
	"soft_deny",
	"hard_deny",
	"environment",
] as const;

export type AutoModeList = (typeof AUTO_MODE_LISTS)[number];

export interface AutoModeKey {
	readonly name: string;
	readonly kind: Kind;
	readonly route: string;
	readonly value?: string;
}

export const AUTO_MODE_KEYS: readonly AutoModeKey[] = [
	{
		name: "autoMode",
		kind: SETTING,
		route: "configure/permissions/auto-mode",
	},
	// A list without `$defaults` replaces the built-in rules, so each list starts with it.
	...AUTO_MODE_LISTS.map(
		(name): AutoModeKey => ({
			name: `autoMode.${name}`,
			kind: SETTING,
			route: "configure/permissions/auto-mode-rules",
			value: DEFAULTS,
		}),
	),
	// Unset: `false` equals unset, and a managed `true` wins anyway.
	{
		name: "autoMode.classifyAllShell",
		kind: SETTING,
		route: "configure/permissions/auto-mode",
	},
	// Unset: a cheaper classifier model may block differently, and a server-configured model wins.
	{
		name: "CLAUDE_CODE_AUTO_MODE_MODEL",
		kind: ENV,
		route: "configure/permissions/auto-mode",
	},
];

export type AutoModeLists = Readonly<Record<AutoModeList, readonly string[]>>;

export interface AutoModeSnippet {
	readonly autoMode: AutoModeLists & { readonly classifyAllShell?: boolean };
	readonly env: Readonly<Record<string, string>>;
}

/** The rule lists hold `DEFAULTS` only, since no rule of ours has a source yet. */
export const autoModeSnippet = (): AutoModeSnippet => ({
	autoMode: {
		allow: [DEFAULTS],
		soft_deny: [DEFAULTS],
		hard_deny: [DEFAULTS],
		environment: [DEFAULTS, ...environmentEntries()],
	},
	env: {},
});
