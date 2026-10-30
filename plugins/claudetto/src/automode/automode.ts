// Each route below was read against `2.1.312` and holds the behavior its row claims. The key names
// are checked against the installed program by `src/automode/__tests__/automode.spec.ts`. One claim of
// `openspec/changes/claudetto-restart/specs/low-hitl/spec.md` is on no `clawdipedia` page and comes
// from the page the spec cites, `permission-modes` on `code.claude.com`: broad allow rules are
// dropped on entry to auto mode. `faults.ts` carries that quote.

import { ENV, type Kind, SETTING } from "../keys.ts";
import { settingsFileIn } from "../settings-file.ts";
import { environmentEntries } from "./environment.ts";

/**
 * Where setup writes `autoMode`: the user settings file, and nowhere else. The program reads the key
 * from user settings, `--settings`, and managed settings only, so a project, local, or plugin file
 * would hold a key that is never in effect (`specs/low-hitl/spec.md`, "Setup Writes `autoMode` to
 * User Settings").
 */
export const AUTO_MODE_TARGET = "user";

/** The path of the target file under `configDir`, which is `~/.claude` on a default login. */
export const autoModeTargetFile = (configDir: string): string =>
	settingsFileIn(configDir);

/** The marker that keeps the built-in rules of a list in its own position. */
export const DEFAULTS = "$defaults";

/** The four lists of `autoMode` that hold rules, each of which must start with `DEFAULTS`. */
export const AUTO_MODE_LISTS = [
	"allow",
	"soft_deny",
	"hard_deny",
	"environment",
] as const;

/** One of the four names in `AUTO_MODE_LISTS`, as a union of string literals. */
export type AutoModeList = (typeof AUTO_MODE_LISTS)[number];

/** A key that setup decides on for auto mode: a settings key or an env var, with the value it writes or none when it leaves the key unset. */
export interface AutoModeKey {
	readonly name: string;
	readonly kind: Kind;
	/** The `clawdipedia` route that was read for the key. */
	readonly route: string;
	/** What claudetto writes, or none when it writes nothing. */
	readonly value?: string;
}

/** Every key setup weighed for auto mode, written or left unset on purpose, each with the route it was read from and the reason in the comment above its row. */
export const AUTO_MODE_KEYS: readonly AutoModeKey[] = [
	// Written: the classifier reads `autoMode` and the lists below it from the settings files.
	{
		name: "autoMode",
		kind: SETTING,
		route: "configure/permissions/auto-mode",
	},
	// A list without `$defaults` replaces the built-in rules, so each list starts with it. The facts
	// `environment` adds after it are in `environment.ts`; no rule is invented for them.
	...AUTO_MODE_LISTS.map(
		(name): AutoModeKey => ({
			name: `autoMode.${name}`,
			kind: SETTING,
			route: "configure/permissions/auto-mode-rules",
			value: DEFAULTS,
		}),
	),
	// Unset. `true` suspends every `Bash` and `PowerShell` allow rule and sends each shell
	// command to the classifier. The default is `false`, and `false` is the same as unset: the flag is
	// on when any source sets `true`, so a `false` of ours could not turn off a managed `true` anyway.
	{
		name: "autoMode.classifyAllShell",
		kind: SETTING,
		route: "configure/permissions/auto-mode",
	},
	// Unset. A cheaper model may not block and allow the same actions as the default
	// classifier model, and no measurement of ours has been made. The key is `[Undocumented]`, and a
	// server-configured classifier model wins over it, which is a second reason not to write it.
	{
		name: "CLAUDE_CODE_AUTO_MODE_MODEL",
		kind: ENV,
		route: "configure/permissions/auto-mode",
	},
];

/** The rule strings of each of the four lists, read-only. */
export type AutoModeLists = Readonly<Record<AutoModeList, readonly string[]>>;

/** The object setup writes to the user settings: an `autoMode` block and an `env` block, which `autoModeSnippet` leaves empty. */
export interface AutoModeSnippet {
	/** The `autoMode` block of the user settings. */
	readonly autoMode: AutoModeLists & { readonly classifyAllShell?: boolean };
	/** The `env` block of the same file. */
	readonly env: Readonly<Record<string, string>>;
}

/**
 * The snippet setup writes to `AUTO_MODE_TARGET`, as a value. The three rule lists hold `DEFAULTS`
 * and nothing else, because no rule of ours has a source yet. `environment` adds the facts of this
 * project after `DEFAULTS`, each of which `ENVIRONMENT_FACTS` names a reading for.
 */
export const autoModeSnippet = (): AutoModeSnippet => ({
	autoMode: {
		allow: [DEFAULTS],
		soft_deny: [DEFAULTS],
		hard_deny: [DEFAULTS],
		environment: [DEFAULTS, ...environmentEntries()],
	},
	env: {},
});
