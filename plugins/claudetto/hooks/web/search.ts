import { USER_AGENT } from "./chrome";
import type { FetchDeps } from "./fetch";
import {
	decodeEntities,
	descendants,
	type Element,
	hasClass,
	parseHtml,
	textOf
} from "./html";

/** One search hit. */
export interface SearchResult {
	title: string;
	url: string;
	snippet: string;
}

/** The arguments of `web_search`. */
export interface SearchInput {
	query: string;
	max_results?: number | undefined;
}

/** Results returned when `max_results` is not given. */
export const DEFAULT_RESULTS = 8;
const MAX_RESULTS = 25;

const squash = (text: string): string =>
	decodeEntities(text).replaceAll(/\s+/gu, " ").trim();

/**
 * Resolves a DuckDuckGo result link to its destination. DuckDuckGo wraps each
 * result in `//duckduckgo.com/l/?uddg=<encoded url>&rut=...` to count clicks.
 *
 * @param href The `href` of a result link.
 * @returns The destination URL, or undefined for an ad or an unusable link.
 */
export function decodeDdgUrl(href: string): string | undefined {
	const absolute = href.startsWith("//") ? `https:${href}` : href;
	let url: URL;
	try {
		url = new URL(absolute, "https://duckduckgo.com/");
	} catch {
		return undefined;
	}
	if (url.hostname.endsWith("duckduckgo.com")) {
		if (url.pathname === "/y.js") {
			// Sponsored result: its click-through is not a destination.
			return undefined;
		}
		const target = url.searchParams.get("uddg");
		return target !== null && /^https?:\/\//iu.test(target)
			? target
			: undefined;
	}
	return /^https?:$/u.test(url.protocol) ? url.href : undefined;
}

function inAd(el: Element): boolean {
	for (let n: Element | null = el; n; n = n.parent) {
		if (hasClass(n, "result--ad")) {
			return true;
		}
	}
	return false;
}

/**
 * Parses DuckDuckGo's HTML results page into title, URL and snippet.
 *
 * @param html The results page.
 */
export function parseDdg(html: string): SearchResult[] {
	const results: SearchResult[] = [];
	let current: SearchResult | undefined;
	const marks = descendants(parseHtml(html)).filter(
		(el) => hasClass(el, "result__a") || hasClass(el, "result__snippet")
	);
	for (const el of marks) {
		if (hasClass(el, "result__a")) {
			const url = inAd(el) ? undefined : decodeDdgUrl(el.attrs["href"] ?? "");
			current =
				url === undefined
					? undefined
					: { title: squash(textOf(el)), url, snippet: "" };
			if (current !== undefined) {
				results.push(current);
			}
		} else if (current?.snippet === "") {
			current.snippet = squash(textOf(el));
		}
	}
	return results;
}

/**
 * Whether DuckDuckGo answered with its bot check instead of results.
 *
 * @param status The HTTP status; the bot check answers 202.
 * @param html The page source.
 */
export function isDdgBlocked(status: number, html: string): boolean {
	return (
		status === 202 ||
		/anomaly-modal|anomaly\.js|Unfortunately, bots use DuckDuckGo too/iu.test(
			html
		)
	);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const stripTags = (text: string): string =>
	squash(text.replaceAll(/<[^>]+>/gu, ""));

/** One Brave result row, or nothing when it lacks a title or URL. */
function braveRow(row: unknown): SearchResult[] {
	if (
		!isRecord(row) ||
		typeof row["url"] !== "string" ||
		typeof row["title"] !== "string"
	) {
		return [];
	}
	const description = row["description"];
	return [
		{
			title: stripTags(row["title"]),
			url: row["url"],
			snippet: typeof description === "string" ? stripTags(description) : ""
		}
	];
}

/**
 * Parses Brave Search's API answer.
 *
 * @param json The response body.
 */
export function parseBrave(json: string): SearchResult[] {
	let data: unknown;
	try {
		data = JSON.parse(json);
	} catch {
		return [];
	}
	const web = isRecord(data) ? data["web"] : undefined;
	const rows = isRecord(web) ? web["results"] : undefined;
	return Array.isArray(rows)
		? rows.flatMap((row: unknown) => braveRow(row))
		: [];
}

/**
 * Formats hits as `1. Title — url` lines with the snippet indented beneath.
 *
 * @param results The hits.
 * @param max How many to print.
 */
export function formatResults(results: SearchResult[], max: number): string {
	return results
		.slice(0, max)
		.map(
			(r, i) =>
				`${i + 1}. ${r.title} — ${r.url}${r.snippet === "" ? "" : `\n   ${r.snippet}`}`
		)
		.join("\n");
}

/** What `searchWeb` needs beyond what `fetchPage` does. */
export type SearchDeps = Pick<
	FetchDeps,
	"chrome" | "interactive" | "net" | "notify"
> & {
	/** The Brave Search API key, when one is configured. */
	braveKey: string | undefined;
};

const BLOCKED_MESSAGE =
	"DuckDuckGo blocked the search as automated traffic. Set BRAVE_SEARCH_API_KEY to use Brave Search, or use web_fetch on a known URL.";

/** Brave's API; any failure is an empty list so DuckDuckGo still answers. */
async function braveSearch(
	deps: SearchDeps,
	query: string,
	count: number
): Promise<SearchResult[]> {
	if (deps.braveKey === undefined || deps.braveKey === "") {
		return [];
	}
	try {
		const res = await deps.net(
			`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`,
			{
				accept: "application/json",
				"x-subscription-token": deps.braveKey,
				"user-agent": USER_AGENT
			}
		);
		return res.status >= 200 && res.status < 300 ? parseBrave(res.text) : [];
	} catch {
		// Brave is unreachable: DuckDuckGo still answers.
		return [];
	}
}

/** DuckDuckGo's HTML endpoint by plain request; a bot check or a failure is an empty list. */
async function ddgDirect(
	deps: SearchDeps,
	url: string
): Promise<SearchResult[]> {
	try {
		const res = await deps.net(url, {
			"user-agent": USER_AGENT,
			"accept-language": "en-US,en;q=0.9"
		});
		return isDdgBlocked(res.status, res.text) ? [] : parseDdg(res.text);
	} catch {
		return [];
	}
}

/**
 * DuckDuckGo through Chrome: a headless render, then in a session with a
 * person a visible window to pass the bot check.
 */
async function ddgBrowser(
	deps: SearchDeps,
	url: string
): Promise<{ hits: SearchResult[]; blocked: boolean }> {
	const { chrome } = deps;
	if (chrome === undefined) {
		return { hits: [], blocked: true };
	}
	let html = await chrome.render(url);
	if (html !== undefined && isDdgBlocked(200, html) && deps.interactive) {
		await deps.notify(
			"claudetto: DuckDuckGo shows a bot check. Solve it in the Chrome window that opens, then close the window. Waiting up to 3 minutes."
		);
		await chrome.solve(url);
		html = await chrome.render(url);
	}
	const blocked = html === undefined || isDdgBlocked(200, html);
	return { hits: html === undefined || blocked ? [] : parseDdg(html), blocked };
}

/**
 * Searches the web: Brave's API when a key is set (falling through to
 * DuckDuckGo if it fails), else DuckDuckGo's HTML endpoint, else a headless
 * render of that endpoint, and in a session with a person a visible window to
 * pass DuckDuckGo's bot check.
 *
 * @param deps The collaborators.
 * @param input The query and the result count.
 * @returns The reply text, never throwing: a failure is the reply.
 */
export async function searchWeb(
	deps: SearchDeps,
	input: SearchInput
): Promise<string> {
	const query = input.query.trim();
	if (query === "") {
		return "The query is empty.";
	}
	const wanted = Math.trunc(input.max_results ?? DEFAULT_RESULTS);
	const max = Math.min(Math.max(wanted || DEFAULT_RESULTS, 1), MAX_RESULTS);
	const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
	let hits = await braveSearch(deps, query, max);
	if (hits.length === 0) {
		hits = await ddgDirect(deps, url);
	}
	if (hits.length > 0) {
		return formatResults(hits, max);
	}
	const browsed = await ddgBrowser(deps, url);
	if (browsed.hits.length > 0) {
		return formatResults(browsed.hits, max);
	}
	return browsed.blocked ? BLOCKED_MESSAGE : `No results for: ${query}`;
}
