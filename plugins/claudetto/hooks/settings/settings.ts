import type { EngineInterface } from "claude-code";

/** The Claude Code config folder: `$CLAUDE_CONFIG_DIR`, else `~/.claude`. */
export async function configDir($: EngineInterface): Promise<string> {
	const config = await $.env.get("CLAUDE_CONFIG_DIR");
	if (config !== undefined && config !== "") {
		return config;
	}
	return `${await $.env.get("HOME")}/.claude`;
}

/** The user settings file: `settings.json` in the config folder. */
export async function userSettingsPath($: EngineInterface): Promise<string> {
	return `${await configDir($)}/settings.json`;
}

/** The indent a settings file already uses, so a rewrite keeps its layout. */
export const indentOf = (text: string): string =>
	/\n([ \t]+)"/u.exec(text)?.[1] ?? "\t";

export type Json = Record<string, unknown>;

export const isRecord = (value: unknown): value is Json =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** Parses settings text; undefined when the file holds no JSON object. */
export const parseSettings = (text: string): Json | undefined => {
	try {
		const value: unknown = JSON.parse(text);
		return isRecord(value) ? value : undefined;
	} catch {
		// Callers log the undefined result, so the parse error is not dropped.
		return undefined;
	}
};
