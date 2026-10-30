// Where the user settings file is. `automode/automode.ts` and `sandbox/sandbox.ts` both name it as
// the one scope setup writes, and each held its own copy of this path until the `settings.read` hook
// of `tiers/hooks.ts` reached them through `tiers/snippet.ts`: a hooks module imports its own files
// and `claude-code` and nothing else, so the `node:path` call of those copies stopped the whole
// module from loading. The join is plain string work for the same reason.

const TRAILING_SLASHES = /\/+$/;

/** The file name of the user settings inside the config directory. */
export const SETTINGS_FILE = "settings.json";

/** The path of `SETTINGS_FILE` under `configDir`, which is `~/.claude` on a default login. */
export const settingsFileIn = (configDir: string): string =>
	`${configDir.replace(TRAILING_SLASHES, "")}/${SETTINGS_FILE}`;
