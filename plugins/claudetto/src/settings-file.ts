// Plain string join: a hooks module may import only its own files and `claude-code`, not `node:path`.

import type { Json } from "./tiers/merge.ts";

const TRAILING_SLASHES = /\/+$/;

export const SETTINGS_FILE = "settings.json";

export const settingsFileIn = (configDir: string): string =>
	`${configDir.replace(TRAILING_SLASHES, "")}/${SETTINGS_FILE}`;

const isObject = (value: unknown): value is Json =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** The user settings file, in `CLAUDE_CONFIG_DIR` when it is set. */
export const settingsFileFor = (
	configDir: string | undefined,
	home: string | undefined,
): string =>
	settingsFileIn(
		configDir === undefined || configDir === "" ? `${home}/.claude` : configDir,
	);

/** The settings a file's `text` holds, `{}` for no file, or `undefined` when it is not a JSON object. */
export const settingsOf = (text: string | undefined): Json | undefined => {
	if (text === undefined) {
		return {};
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return undefined;
	}
	return isObject(parsed) ? parsed : undefined;
};
