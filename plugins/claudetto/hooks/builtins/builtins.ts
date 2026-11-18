import type { On } from "claude-code";

import { indentOf, isRecord, parseSettings, userSettingsPath } from "../settings/settings";

/**
 * The bundled plugins that Claude Code 2.1.327 registers (chunk-syz79m2z.js@450-1844).
 * claudetto replaces each one or drops it. A plugin cannot refuse a builtin at load
 * (CON-009), so the disable is `enabledPlugins` `false` in user settings (ADR-0057).
 */
export const BUILTIN_IDS: readonly string[] = [
	"cc-plugin-sec-default",
	"cc-plugin-agents-md",
	"cc-plugin-telemetry",
	"cc-plugin-privacy",
	"cc-plugin-plugin-authoring",
	"cc-plugin-mods-guide",
	"cc-plugin-tips",
	"cc-plugin-mermaid",
	"cc-plugin-responsive-mode",
	"cc-plugin-diff",
	"cc-plugin-you-should-know",
	"cc-plugin-easel",
	"claude-platform",
];

export type Repair = { readonly text: string; readonly drifted: readonly string[] };

/** Sets every builtin id to `false` in the settings text; undefined when the text is not a JSON object. */
export const repairSettings = (text: string | undefined): Repair | undefined => {
	const held = text === undefined || text.trim() === "" ? {} : parseSettings(text);
	if (held === undefined) return undefined;
	const enabled = isRecord(held["enabledPlugins"]) ? held["enabledPlugins"] : {};
	const drifted = BUILTIN_IDS.map((id) => `${id}@builtin`).filter((key) => enabled[key] !== false);
	if (drifted.length === 0) return { text: text ?? "", drifted };
	const next = { ...held, enabledPlugins: { ...enabled, ...Object.fromEntries(drifted.map((key) => [key, false])) } };
	return { text: `${JSON.stringify(next, null, indentOf(text ?? ""))}\n`, drifted };
};

const notice = (drifted: readonly string[], interactive: boolean): string =>
	`claudetto turned off ${drifted.length} builtin plugin(s) in user settings: ${drifted.join(", ")}. ` +
	(interactive ? "Run /reload-plugins to unload them now." : "They stay loaded until the next start.");

/** Repairs builtin drift at session start (REQ-SETUP-011, RT-040). */
export function disableBuiltins(on: On): void {
	on("session.start", async ($, e, next) => {
		const result = await next(e);
		const path = await userSettingsPath($);
		const text = (await $.fs.exists(path)) ? await $.fs.read(path) : undefined;
		const repair = repairSettings(text);
		if (repair === undefined) {
			$.ui.log(`claudetto left ${path} alone: it does not hold a JSON object, so the builtin plugins stay as they are.`);
			return result;
		}
		if (repair.drifted.length === 0) return result;
		await $.fs.write(path, repair.text);
		$.ui.log(notice(repair.drifted, e.isInteractive));
		return result;
	});
}
