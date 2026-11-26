import type { EngineInterface, On, SessionStartInput } from "claude-code";

import { fault } from "../shared/fault";
import { type Chrome, findChrome, makeChrome } from "./chrome";
import { parseJar } from "./cookies";
import { type FetchDeps, fetchPage } from "./fetch";
import { searchWeb } from "./search";

/** The plugin's name, which prefixes each tool it registers. */
const PLUGIN = "claudetto";

/** The model-facing name of `web_fetch`. */
export const FETCH_FULL_NAME = `mcp__${PLUGIN}__web_fetch`;
/** The model-facing name of `web_search`. */
export const SEARCH_FULL_NAME = `mcp__${PLUGIN}__web_search`;

/** The `web_fetch` registration. */
export const FETCH_TOOL = {
	name: "web_fetch",
	description:
		"Fetch a URL; returns its main content as compact Markdown. JS-only or blocked pages render in headless Chrome. Output is capped at max_chars; the reply names a saved full copy and the resume offset.",
	inputSchema: {
		type: "object",
		properties: {
			url: { type: "string", description: "The http or https URL." },
			max_chars: {
				type: "number",
				description: "Characters to return (default 8000)."
			},
			offset: {
				type: "number",
				description: "Character to start at, to page through a long page."
			}
		},
		required: ["url"]
	}
};

/** The `web_search` registration. */
export const SEARCH_TOOL = {
	name: "web_search",
	description:
		"Search the web; returns numbered title, URL and snippet lines. Uses Brave Search when BRAVE_SEARCH_API_KEY is set, else DuckDuckGo. Follow a result with web_fetch.",
	inputSchema: {
		type: "object",
		properties: {
			query: { type: "string", description: "The search query." },
			max_results: {
				type: "number",
				description: "Results to return (default 8)."
			}
		},
		required: ["query"]
	}
};

/** The built-in tools these two replace; the engine never offers them. */
const REPLACED = new Set(["WebFetch", "WebSearch"]);

const WEB_TOOLS = new RegExp(
	`^(?:${FETCH_FULL_NAME}|${SEARCH_FULL_NAME})$`,
	"u"
);

/**
 * Whether a subagent type is the Hermes agent, bare or namespaced by its
 * plugin (`claudetto:Hermes`). Only Hermes gathers online intelligence
 * (TOOLS-005).
 */
const isHermes = (type: string | undefined): boolean =>
	type === "Hermes" || type?.endsWith(":Hermes") === true;

const JAR_KEY = "web.cookies";

/** Wires the real collaborators of one call: the host's HTTP, Chrome and the plugin's data folder. */
async function makeDeps(
	$: EngineInterface,
	interactive: boolean,
	chromeCache: { binary?: string | undefined }
): Promise<FetchDeps> {
	const env = await $.process.hookEnv();
	const data = env["CLAUDE_PLUGIN_DATA"] ?? "";
	chromeCache.binary ??= await findChrome($);
	let chrome: Chrome | undefined;
	if (chromeCache.binary !== undefined) {
		chrome = makeChrome($, chromeCache.binary, `${data}/chrome-profile`);
	}
	return {
		net: async (url, headers) => {
			const res = await $.http.fetch(url, { headers });
			return { status: res.status, headers: res.headers, text: res.text };
		},
		chrome,
		loadJar: async () => parseJar(await $.store.get(JAR_KEY)),
		saveJar: (jar) => $.store.set(JAR_KEY, jar),
		interactive,
		notify: async (text) => {
			await $.ui.notify(text, { title: "claudetto" });
		},
		writeFile: (path, text) => $.fs.write(path, text),
		readFile: async (path) => {
			// No saved copy yet is the usual case; the debug log tells it from a failed read.
			const text = await $.fs.read(path).catch((error: unknown) => {
				fault($, "saved page read", error);
				return null;
			});
			return typeof text === "string" ? text : undefined;
		},
		saveDir: `${data}/web`
	};
}

/** Whether a person is at the prompt, as the session reported at start. */
let interactive = false;

/**
 * The session-start work of the web tools: notes whether a person is present
 * and registers both tools. `registerStart` runs it, because core allows one
 * unmatched `session.start` hook per plugin.
 *
 * @param $ The plugin's engine interface.
 * @param e The session-start input.
 */
export async function startWeb(
	$: EngineInterface,
	e: SessionStartInput
): Promise<void> {
	// A captcha window needs a person at the prompt: `-p` runs and the SDK have none.
	interactive = e.isInteractive;
	await $.tool.register(FETCH_TOOL);
	await $.tool.register(SEARCH_TOOL);
}

/**
 * Serves `web_fetch` and `web_search` and hides the built-in WebFetch and
 * WebSearch from every loop (TOOLS-020, TOOLS-021).
 *
 * @param on The engine's hook registrar.
 */
export function registerWeb(on: On): void {
	const chromeCache: { binary?: string | undefined } = {};
	on("tool.run", { tool: FETCH_FULL_NAME }, async ($, e) => ({
		result: await fetchPage(await makeDeps($, interactive, chromeCache), {
			url: e.url,
			max_chars: e.max_chars,
			offset: e.offset
		})
	})).catch(($, _e, next) => {
		fault($, "web_fetch", next.error);
		return { deny: "web_fetch failed; see the debug log" };
	});
	on("tool.run", { tool: SEARCH_FULL_NAME }, async ($, e) => {
		const deps = await makeDeps($, interactive, chromeCache);
		return {
			result: await searchWeb(
				{ ...deps, braveKey: await $.env.get("BRAVE_SEARCH_API_KEY") },
				{ query: e.query, max_results: e.max_results }
			)
		};
	}).catch(($, _e, next) => {
		fault($, "web_search", next.error);
		return { deny: "web_search failed; see the debug log" };
	});
	on("tool.offer", (_$, e, next) =>
		REPLACED.has(e.tool) ? { isOffered: false } : next(e)
	).catch(($, e, next) => {
		fault($, "web tool offer", next.error);
		return next(e);
	});
	on("tool.offer", { tool: WEB_TOOLS }, (_$, e, next) =>
		e.agentId !== undefined && !isHermes(e.subagentType)
			? { isOffered: false }
			: next(e)
	).catch(($, e, next) => {
		fault($, "web tool offer", next.error);
		return next(e);
	});
}
