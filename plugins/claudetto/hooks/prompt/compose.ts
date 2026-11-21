import type { On } from "claude-code";

import { TOOL_FULL_NAME as PATCH } from "../patch/texts";
import { fault } from "../shared/fault";
import {
	FETCH_FULL_NAME as FETCH,
	SEARCH_FULL_NAME as SEARCH
} from "../web/register";
import { memorySection } from "./memory";

/**
 * ENGINE(v2.1.330): the stock line of the short prompt's `lean_body` section
 * that points at the dedicated tools; it names none. `prompt.section` does not
 * fire for `lean_body`, so only `prompt.compose` reaches it.
 */
export const STOCK_LEAN_LINE =
	" - Prefer the dedicated file/search tools over shell commands when one fits. Independent tool calls can run in parallel in one response.";

/**
 * ENGINE(v2.1.330): the stock first bullet of the full prompt's `tools`
 * section; it names Read, Edit and Write, two of which claudetto turns off.
 */
export const STOCK_TOOLS_LINE =
	" - Prefer dedicated tools over Bash when one fits (Read, Edit, Write) — reserve Bash for shell-only operations.";

/** The parallel-calls half of the stock `lean_body` line, kept as written. */
const PARALLEL = "Independent tool calls can run in parallel in one response.";

/** What each tool this plugin replaces does, by the name the model calls it with. */
const PHRASE: readonly (readonly [string, string])[] = [
	["Read", ""],
	["Edit", ""],
	["Write", ""],
	["NotebookEdit", ""],
	[PATCH, " (create, edit, move or delete files, many per call)"],
	["WebFetch", ""],
	["WebSearch", ""],
	[FETCH, " (read a URL as text)"],
	[SEARCH, " (search the web)"]
];

/** The offered tools that replace file and web tools, each in backticks with its job. */
export const toolList = (offered: readonly string[]): string =>
	PHRASE.filter(([name]) => offered.includes(name))
		.map(([name, job]) => `\`${name}\`${job}`)
		.join(", ");

/** The `lean_body` text with its tools line naming the offered tools; unchanged when the stock line moved. */
export const leanBody = (stock: string, offered: readonly string[]): string =>
	stock.replace(
		STOCK_LEAN_LINE,
		` - Prefer the dedicated tools over shell commands when one fits: ${toolList(offered)}. ${PARALLEL}`
	);

/** The `tools` text with its first bullet naming the offered tools; unchanged when the stock line moved. */
export const toolsSection = (
	stock: string,
	offered: readonly string[]
): string =>
	stock.replace(
		STOCK_TOOLS_LINE,
		` - Prefer dedicated tools over Bash when one fits (${toolList(offered)}) — reserve Bash for shell-only operations.`
	);

/**
 * Names `patch`, `web_fetch` and `web_search` where the stock prompt names the
 * tools they replace, and names no tool that is off (REQ-TOOLS-030). Every other
 * line, the safety and permission rules included, stays as the engine wrote it,
 * and sections keep their order, so shared ones stay ahead of session ones and
 * the cache boundary does not move.
 */
export function registerCompose(on: On): void {
	on("prompt.compose", async (_$, e, next) => {
		const composed = await next(e);
		const sections = composed.sections.map((section) => {
			if (section.id === "lean_body") {
				return {
					id: section.id,
					scope: section.scope,
					text: leanBody(section.text, e.tools)
				};
			}
			if (section.id === "tools") {
				return {
					id: section.id,
					scope: section.scope,
					text: toolsSection(section.text, e.tools)
				};
			}
			if (section.id === "memory") {
				return {
					id: section.id,
					scope: section.scope,
					text: memorySection(section.text, e.tools)
				};
			}
			return section;
		});
		return { sections };
	}).catch(($, e, next) => {
		fault($, "prompt compose", next.error);
		return next(e);
	});
}
