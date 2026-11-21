import { type Body, type NetResponse, readBody, readDom } from "./body";
import type { Chrome } from "./chrome";
import { USER_AGENT } from "./chrome";
import { cookieHeader, type Jar, remember } from "./cookies";

export type { NetResponse } from "./body";

/** The pieces `fetchPage` works through; the tool wires real ones, tests wire fixtures. */
export interface FetchDeps {
	net: (url: string, headers: Record<string, string>) => Promise<NetResponse>;
	/** Undefined when no Chrome is installed. */
	chrome: Chrome | undefined;
	loadJar: () => Promise<Jar>;
	saveJar: (jar: Jar) => Promise<void>;
	/** Whether a person is at the prompt and can solve a challenge. */
	interactive: boolean;
	notify: (text: string) => Promise<void>;
	writeFile: (path: string, text: string) => Promise<void>;
	readFile: (path: string) => Promise<string | undefined>;
	/** Folder that holds the saved Markdown copies. */
	saveDir: string;
}

/** The arguments of `web_fetch`. */
export interface FetchInput {
	url: string;
	max_chars?: number | undefined;
	offset?: number | undefined;
}

/** Characters returned per call when `max_chars` is not given. */
export const DEFAULT_MAX_CHARS = 8000;
const HARD_MAX_CHARS = 200_000;

/** Request headers of a desktop browser; the default fetch identity gets refused by many sites. */
const HEADERS = {
	"user-agent": USER_AGENT,
	accept:
		"text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
	"accept-language": "en-US,en;q=0.9"
};

/** FNV-1a, 32 bit: a short stable name for a URL's saved copy. */
function hash(text: string): string {
	let h = 2_166_136_261;
	for (let i = 0; i < text.length; i += 1) {
		h = Math.imul(h ^ (text.codePointAt(i) ?? 0), 16_777_619);
	}
	return (h >>> 0).toString(16).padStart(8, "0");
}

/** The saved-copy path for `url` in `dir`. */
export function savedPath(dir: string, url: string): string {
	return `${dir}/${hash(url)}.md`;
}

/** Frames one window of the full Markdown with where it sits and how to get the rest. */
function frame(
	url: string,
	via: string,
	markdown: string,
	range: { offset: number; max: number },
	path: string
): string {
	const body = markdown.slice(range.offset, range.offset + range.max);
	const end = range.offset + body.length;
	const rest =
		end < markdown.length
			? ` More: call again with offset=${end}, or Read ${path}.`
			: "";
	return `${url} (${via}) chars ${range.offset}-${end} of ${markdown.length}. Full Markdown saved: ${path}.${rest}\n---\n${body}`;
}

function clampInt(
	value: number | undefined,
	fallback: number,
	max: number
): number {
	return value === undefined || !Number.isFinite(value)
		? fallback
		: Math.min(Math.max(Math.trunc(value), 0), max);
}

/** The direct request, with the host's own cookies and a browser identity. */
async function direct(deps: FetchDeps, url: URL): Promise<Body> {
	// Cookies leave only for the exact host they were saved under.
	const jar = await deps.loadJar();
	const cookie = cookieHeader(jar, url.hostname);
	try {
		const res = await deps.net(
			url.href,
			cookie === undefined ? HEADERS : { ...HEADERS, cookie }
		);
		const setCookie = res.headers["set-cookie"];
		if (setCookie !== undefined && res.status < 400) {
			await deps.saveJar(remember(jar, url.hostname, setCookie));
		}
		return readBody(res, url.href);
	} catch (error) {
		return { kind: "render", why: `request failed: ${String(error)}` };
	}
}

/** The outcome of the browser fallback: Markdown, or the reply that ends the call. */
type Rendered = { markdown: string } | { reply: string };

/** Lets a person solve the captcha in a visible window, then reads the page again. */
async function solveAndRender(
	deps: FetchDeps,
	chrome: Chrome,
	url: URL
): Promise<Body | undefined> {
	await deps.notify(
		`claudetto: ${url.hostname} shows a captcha. Solve it in the Chrome window that opens, then close the window. Waiting up to 3 minutes.`
	);
	await chrome.solve(url.href);
	return readDom(await chrome.render(url.href), url.href);
}

async function viaChrome(
	deps: FetchDeps,
	url: URL,
	why: string
): Promise<Rendered> {
	const { chrome } = deps;
	if (chrome === undefined) {
		return {
			reply: `Direct fetch failed (${why}) and no Chrome or Chromium was found to render ${url.href}. Install one or set CHROME_PATH.`
		};
	}
	let rendered = readDom(await chrome.render(url.href), url.href);
	if (rendered?.kind === "challenge") {
		if (!deps.interactive) {
			return {
				reply: `A captcha blocks ${url.href} and this session has no one to solve it. Ask the user to open the URL in their browser.`
			};
		}
		rendered = await solveAndRender(deps, chrome, url);
		if (rendered?.kind === "challenge") {
			return {
				reply: `The captcha on ${url.href} is still unsolved. Ask the user to open the URL in their browser.`
			};
		}
	}
	if (rendered?.kind !== "ok") {
		const cause =
			rendered === undefined ? "failed" : "found no readable content";
		return {
			reply: `Could not read ${url.href}: direct fetch failed (${why}) and the Chrome render ${cause}.`
		};
	}
	return { markdown: rendered.markdown };
}

/** Parses the argument into an http(s) URL, or the reply that refuses it. */
function parseUrl(text: string): URL | string {
	let parsed: URL;
	try {
		parsed = new URL(text);
	} catch {
		return `Not a URL: ${text}`;
	}
	return parsed.protocol === "http:" || parsed.protocol === "https:"
		? parsed
		: `Only http and https URLs can be fetched: ${text}`;
}

/** The page's Markdown and the route that got it, or the reply that ends the call. */
async function obtain(
	deps: FetchDeps,
	url: URL
): Promise<{ markdown: string; via: string } | { reply: string }> {
	const first = await direct(deps, url);
	if (first.kind === "final") {
		return { reply: first.message };
	}
	let got = { markdown: "", via: "direct" };
	if (first.kind === "ok") {
		got = { markdown: first.markdown, via: "direct" };
	} else {
		const why = first.kind === "render" ? first.why : "bot check";
		const rendered = await viaChrome(deps, url, why);
		if ("reply" in rendered) {
			return rendered;
		}
		got = { markdown: rendered.markdown, via: "chrome" };
	}
	return got.markdown.trim() === ""
		? { reply: `${url.href} has no content.` }
		: got;
}

/**
 * Fetches a page and answers with a window of its main content as Markdown.
 *
 * A direct request goes first, with a browser User-Agent and the cookies saved
 * for that host. A refusal, an empty page or a script-only shell falls back to
 * a headless Chrome render. A captcha that survives the render opens a visible
 * Chrome when a person is present, and says so when none is.
 *
 * @param deps The collaborators.
 * @param input The URL, the window size and the window start.
 * @returns The reply text, never throwing: a failure is the reply.
 */
export async function fetchPage(
	deps: FetchDeps,
	input: FetchInput
): Promise<string> {
	const url = parseUrl(input.url);
	if (typeof url === "string") {
		return url;
	}
	const range = {
		max: Math.max(
			1,
			clampInt(input.max_chars, DEFAULT_MAX_CHARS, HARD_MAX_CHARS)
		),
		offset: clampInt(input.offset, 0, Number.MAX_SAFE_INTEGER)
	};
	const path = savedPath(deps.saveDir, url.href);
	const saved = range.offset > 0 ? await deps.readFile(path) : undefined;
	if (saved !== undefined) {
		return range.offset >= saved.length
			? `Offset ${range.offset} is past the end (${saved.length} chars): ${url.href}`
			: frame(url.href, "saved copy", saved, range, path);
	}

	const got = await obtain(deps, url);
	if ("reply" in got) {
		return got.reply;
	}
	try {
		await deps.writeFile(path, got.markdown);
	} catch {
		// The window below still answers; only paging from the saved copy is lost.
	}
	return frame(url.href, got.via, got.markdown, range, path);
}
