// Each route below is `configure/permissions/sandbox` on `clawdipedia`, read against `2.1.312`. The
// key names are checked against the installed program by `src/sandbox/__tests__/sandbox.spec.ts`. The
// faults of a snippet are in `faults.ts`.

import { join } from "node:path";
import { type Kind, SETTING } from "../keys.ts";

/**
 * Where setup writes `sandbox`: the user settings file, which is the one scope setup owns for this
 * login (`specs/low-hitl/spec.md`, "Let the Sandbox Settle Shell Commands"). The route names user
 * settings as a scope a `false` of `allowUnsandboxedCommands` holds from, and `excludedCommands`
 * counts entries from no other scope than managed, `--settings`, and user settings.
 */
export const SANDBOX_TARGET = "user";

/** The file name of the user settings inside the config directory. */
const SETTINGS_FILE = "settings.json";

/** The path of the target file under `configDir`, which is `~/.claude` on a default login. */
export const sandboxTargetFile = (configDir: string): string =>
	join(configDir, SETTINGS_FILE);

const ROUTE = "configure/permissions/sandbox";

/**
 * The secret paths of `denyRead`. `specs/low-hitl/spec.md` names `~/.ssh` and no list, so this is the
 * list the user's own `~/.claude/settings.json` already holds under `sandbox.filesystem.denyRead`.
 * Taking it keeps the snippet equal to what the user already holds.
 */
export const SECRET_PATHS: readonly string[] = [
	"~/.ssh",
	"~/.gnupg",
	"~/.aws/credentials",
	"~/.netrc",
	"~/.docker/config.json",
];

/** Platforms where the route says `sandbox.enabled` works: macOS, Linux, and WSL (reports `linux`). */
const SUPPORTED: readonly string[] = ["darwin", "linux"];

/** True when the sandbox can run on the platform, which `process.platform` names. */
export const sandboxSupported = (platform: string): boolean =>
	SUPPORTED.includes(platform);

/** What a `sandbox` key holds: a string, a boolean, or a read-only list of strings. */
export type SandboxValue = string | boolean | readonly string[];

/** A `sandbox` key that setup decides on, with the value it writes or none when it leaves the key unset. */
export interface SandboxKey {
	readonly name: string;
	readonly kind: Kind;
	/** The `clawdipedia` route that was read for the key. */
	readonly route: string;
	/** What claudetto writes, or none when it writes nothing. */
	readonly value?: SandboxValue;
}

/** Every `sandbox` key setup weighed, written or left unset on purpose, each with the reason in the comment above its row. */
export const SANDBOX_KEYS: readonly SandboxKey[] = [
	// Written where the platform supports it. The default is `false`, and without it every other key
	// here is inert. Without its dependencies a warning shows and commands run unsandboxed.
	{
		name: "sandbox.enabled",
		kind: SETTING,
		route: ROUTE,
		value: true,
	},
	// Unset on purpose. The default is `true`, and it is what auto-allows a sandboxed command (reason
	// `Auto-allowed with sandbox`), so enabling the sandbox is what removes the prompt.
	{
		name: "sandbox.autoAllowBashIfSandboxed",
		kind: SETTING,
		route: ROUTE,
	},
	// Written. The default `true` lets a call use the `dangerouslyDisableSandbox` parameter of `Bash`.
	{
		name: "sandbox.allowUnsandboxedCommands",
		kind: SETTING,
		route: ROUTE,
		value: false,
	},
	// Unset. An exit at startup is worse for this user than an unsandboxed session with a warning, and
	// the spec does not ask for it.
	{
		name: "sandbox.failIfUnavailable",
		kind: SETTING,
		route: ROUTE,
	},
	// Written. Merged across scopes, so this list adds to any other scope's.
	{
		name: "sandbox.filesystem.denyRead",
		kind: SETTING,
		route: ROUTE,
		value: SECRET_PATHS,
	},
	// Unset. It wins over `denyRead`, so an entry over a secret path would re-open it.
	{
		name: "sandbox.filesystem.allowRead",
		kind: SETTING,
		route: ROUTE,
	},
	// Unset. A convenience and not a boundary: a command in it runs outside the sandbox, so `denyRead`
	// does not bind it.
	{
		name: "sandbox.excludedCommands",
		kind: SETTING,
		route: ROUTE,
	},
];

/** The value of the `sandbox` key in settings. Only `filesystem.denyRead` is required, so a platform without a sandbox can leave out `enabled`. */
export interface SandboxBlock {
	readonly enabled?: boolean;
	readonly allowUnsandboxedCommands?: boolean;
	readonly autoAllowBashIfSandboxed?: boolean;
	readonly excludedCommands?: readonly string[];
	readonly filesystem: {
		readonly denyRead: readonly string[];
		readonly allowRead?: readonly string[];
	};
}

/** The object setup writes to the user settings, which holds the `sandbox` block and no other key. */
export interface SandboxSnippet {
	/** The `sandbox` block of the user settings. */
	readonly sandbox: SandboxBlock;
}

/**
 * The snippet setup writes to `SANDBOX_TARGET`, as a value. `enabled` is left out on a platform
 * where the sandbox cannot run, so the file carries no key that claims a sandbox that is not there.
 */
export const sandboxSnippet = (
	platform: string = process.platform,
): SandboxSnippet => ({
	sandbox: {
		...(sandboxSupported(platform) ? { enabled: true } : {}),
		allowUnsandboxedCommands: false,
		filesystem: { denyRead: SECRET_PATHS },
	},
});

/**
 * The decision for a command that runs inside the sandbox, from the route: with `enabled` and the
 * default `autoAllowBashIfSandboxed` of `true`, it is allowed with no prompt.
 */
export const sandboxedCommandDecision = (
	snippet: SandboxSnippet,
	platform: string = process.platform,
): "allow" | "ask" =>
	snippet.sandbox.enabled === true &&
	sandboxSupported(platform) &&
	snippet.sandbox.autoAllowBashIfSandboxed !== false
		? "allow"
		: "ask";

const TRAILING = /(?:\/\*\*|\/\*|\/)+$/;

/** A path without a trailing `/`, `/*`, or `/**`, so `~/.ssh/**` and `~/.ssh` compare equal. */
export const normalizePath = (path: string): string =>
	path.trim().replace(TRAILING, "");

/** True when `inner` is `outer` or lies under it, after `normalizePath`. */
export const isWithin = (inner: string, outer: string): boolean => {
	const a = normalizePath(inner);
	const b = normalizePath(outer);
	return a === b || a.startsWith(`${b}/`);
};

/**
 * The decision for a sandboxed read of `path`: `denied` when a `denyRead` entry holds it and no
 * `allowRead` entry covers it, because `allowRead` wins over `denyRead`.
 */
export const sandboxedReadDecision = (
	snippet: SandboxSnippet,
	path: string,
): "allowed" | "denied" => {
	const { denyRead, allowRead = [] } = snippet.sandbox.filesystem;
	const denied = denyRead.some((entry) => isWithin(path, entry));
	const allowed = allowRead.some((entry) => isWithin(path, entry));
	return denied && !allowed ? "denied" : "allowed";
};
