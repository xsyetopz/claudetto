// Plain string join: a hooks module may import only its own files and `claude-code`, not `node:path`.

const TRAILING_SLASHES = /\/+$/;

export const SETTINGS_FILE = "settings.json";

export const settingsFileIn = (configDir: string): string =>
	`${configDir.replace(TRAILING_SLASHES, "")}/${SETTINGS_FILE}`;
