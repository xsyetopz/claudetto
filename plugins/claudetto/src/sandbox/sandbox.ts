import { type Kind, SETTING } from "../keys.ts";
import { settingsFileIn } from "../settings-file.ts";

/** User settings only: the one scope setup owns, and where a `false` of `allowUnsandboxedCommands` holds. */
export const SANDBOX_TARGET = "user";

export const sandboxTargetFile = (configDir: string): string =>
	settingsFileIn(configDir);

const ROUTE = "configure/permissions/sandbox";

/** The list the user's own `settings.json` already holds under `sandbox.filesystem.denyRead`. */
export const SECRET_PATHS: readonly string[] = [
	"~/.ssh",
	"~/.gnupg",
	"~/.aws/credentials",
	"~/.netrc",
	"~/.docker/config.json",
];

/** Where `sandbox.enabled` works: macOS, Linux, and WSL (which reports `linux`). */
const SUPPORTED: readonly string[] = ["darwin", "linux"];

export const sandboxSupported = (platform: string): boolean =>
	SUPPORTED.includes(platform);

export type SandboxValue = string | boolean | readonly string[];

export interface SandboxKey {
	readonly name: string;
	readonly kind: Kind;
	readonly route: string;
	readonly value?: SandboxValue;
}

export const SANDBOX_KEYS: readonly SandboxKey[] = [
	// Written where supported: the default is `false`, and every other key is inert without it.
	{
		name: "sandbox.enabled",
		kind: SETTING,
		route: ROUTE,
		value: true,
	},
	// Unset: the default `true` auto-allows a sandboxed command, so enabling the sandbox removes the prompt.
	{
		name: "sandbox.autoAllowBashIfSandboxed",
		kind: SETTING,
		route: ROUTE,
	},
	// Written: the default `true` lets a call use `dangerouslyDisableSandbox` of `Bash`.
	{
		name: "sandbox.allowUnsandboxedCommands",
		kind: SETTING,
		route: ROUTE,
		value: false,
	},
	// Unset: an exit at startup is worse than an unsandboxed session with a warning.
	{
		name: "sandbox.failIfUnavailable",
		kind: SETTING,
		route: ROUTE,
	},
	// Written: merged across scopes, so this list adds to any other scope's.
	{
		name: "sandbox.filesystem.denyRead",
		kind: SETTING,
		route: ROUTE,
		value: SECRET_PATHS,
	},
	// Unset: it wins over `denyRead`, so an entry over a secret path would re-open it.
	{
		name: "sandbox.filesystem.allowRead",
		kind: SETTING,
		route: ROUTE,
	},
	// Unset: a convenience, not a boundary; such a command runs outside the sandbox, past `denyRead`.
	{
		name: "sandbox.excludedCommands",
		kind: SETTING,
		route: ROUTE,
	},
];

/** Only `filesystem.denyRead` is required, so a platform without a sandbox can leave out `enabled`. */
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

export interface SandboxSnippet {
	readonly sandbox: SandboxBlock;
}

/** `enabled` is left out where the sandbox cannot run, so the file claims no absent sandbox. */
export const sandboxSnippet = (
	platform: string = process.platform,
): SandboxSnippet => ({
	sandbox: {
		...(sandboxSupported(platform) ? { enabled: true } : {}),
		allowUnsandboxedCommands: false,
		filesystem: { denyRead: SECRET_PATHS },
	},
});

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

/** Strips a trailing `/`, `/*`, or `/**`, so `~/.ssh/**` and `~/.ssh` compare equal. */
export const normalizePath = (path: string): string =>
	path.trim().replace(TRAILING, "");

export const isWithin = (inner: string, outer: string): boolean => {
	const a = normalizePath(inner);
	const b = normalizePath(outer);
	return a === b || a.startsWith(`${b}/`);
};

export const sandboxedReadDecision = (
	snippet: SandboxSnippet,
	path: string,
): "allowed" | "denied" => {
	const { denyRead, allowRead = [] } = snippet.sandbox.filesystem;
	const denied = denyRead.some((entry) => isWithin(path, entry));
	const allowed = allowRead.some((entry) => isWithin(path, entry));
	return denied && !allowed ? "denied" : "allowed";
};
