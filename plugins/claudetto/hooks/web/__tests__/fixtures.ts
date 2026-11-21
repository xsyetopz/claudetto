import type { Chrome } from "../chrome";
import type { FetchDeps, NetResponse } from "../fetch";

const PARAGRAPH =
	"Bun is a fast JavaScript runtime that bundles a package manager, a test runner and a bundler into one executable. ";

/** A news-style page: furniture around one article. */
export const ARTICLE = `<!doctype html>
<html><head><title>Bun &amp; the runtime</title>
<style>.x{color:red}</style><script>window.tracking = "NAVSCRIPT";</script></head>
<body>
<header><a href="/">SITE-BRAND</a></header>
<nav><ul>
<li><a href="/a">NavOne</a></li><li><a href="/b">NavTwo</a></li><li><a href="/c">NavThree</a></li>
<li><a href="/d">NavFour</a></li><li><a href="/e">NavFive</a></li><li><a href="/f">NavSix</a></li>
</ul></nav>
<div class="wrapper">
<article>
<h1>Bun &amp; the runtime</h1>
<p>${PARAGRAPH.repeat(2)}Read the <a href="/docs/install">install guide</a> or the <a href="https://example.org/more">more</a> page.</p>
<h2>Features</h2>
<ul><li>Fast <strong>startup</strong></li><li>Built-in <em>test</em> runner<ul><li>Jest compatible</li></ul></li></ul>
<ol><li>Install</li><li>Run</li></ol>
<pre><code class="language-ts">const x: number = 1;
console.log(x);</code></pre>
<table><tr><th>Name</th><th>Speed</th></tr><tr><td>bun</td><td>fast</td></tr></table>
<blockquote><p>Quoted words.</p></blockquote>
<p>${PARAGRAPH.repeat(3)}Again the <a href="/docs/install">install guide</a>.</p>
</article>
<aside class="related"><h3>ASIDE-HEADING</h3><p>Sponsored nonsense</p></aside>
</div>
<footer><p>FOOTER-TEXT copyright</p></footer>
</body></html>`;

/** A client-rendered shell with nothing to read. */
export const SHELL = `<!doctype html><html><head><title>App</title></head>
<body><div id="root"></div><script src="/bundle.js"></script></body></html>`;

/** The page a headless render yields for the shell once scripts ran. */
export const RENDERED = `<!doctype html><html><head><title>App</title></head>
<body><div id="root"><main><h1>Rendered by script</h1><p>${PARAGRAPH.repeat(4)}</p></main></div></body></html>`;

/** Cloudflare's interstitial. */
export const CHALLENGE = `<!doctype html><html><head><title>Just a moment...</title></head>
<body><div id="challenge-platform"></div><p>Checking your browser before accessing the site.</p></body></html>`;

/** DuckDuckGo's HTML results markup: two organic hits, one ad, relative-protocol redirect links. */
export const DDG_RESULTS = `<!DOCTYPE html><html><head><title>bun runtime at DuckDuckGo</title></head><body>
<div class="serp__results"><div id="links" class="results">
<div class="result results_links results_links_deep result--ad">
<h2 class="result__title"><a class="result__a" href="//duckduckgo.com/y.js?ad_provider=bingv7aa&amp;u3=x">Sponsored bun</a></h2>
<a class="result__snippet" href="//duckduckgo.com/y.js?x=1">Buy it now</a></div>
<div class="result results_links results_links_deep web-result">
<h2 class="result__title"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fbun.com%2Fdocs%3Fa%3D1%26b%3D2&amp;rut=abc">Bun &mdash; <b>Fast</b> JavaScript Runtime</a></h2>
<a class="result__snippet" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fbun.com%2Fdocs&amp;rut=abc">Bun is an all-in-one <b>toolkit</b> &amp; runtime.</a></div>
<div class="result results_links results_links_deep web-result">
<h2 class="result__title"><a rel="nofollow" class="result__a" href="https://en.wikipedia.org/wiki/Bun_(software)">Bun (software) - Wikipedia</a></h2>
<div class="result__snippet">A JavaScript runtime, package manager and test runner.</div></div>
</div></div></body></html>`;

/** What DuckDuckGo answers a request it takes for a bot. */
export const DDG_BLOCKED = `<!DOCTYPE html><html><head><title>DuckDuckGo</title></head><body>
<div class="anomaly-modal__modal"><div class="anomaly-modal__title">Unfortunately, bots use DuckDuckGo too.</div></div>
<script src="/anomaly.js?sv=html"></script></body></html>`;

export const html = (text: string, status = 200): NetResponse => ({
	status,
	headers: { "content-type": "text/html; charset=utf-8" },
	text
});

/** One request the fake server saw. */
export interface Seen {
	url: string;
	headers: Record<string, string>;
}

/** A fake web: routes by full URL, records each request, 404s the rest. */
export function fakeWeb(
	routes: Record<string, NetResponse | ((seen: Seen) => NetResponse)>
): { net: FetchDeps["net"]; seen: Seen[] } {
	const seen: Seen[] = [];
	return {
		seen,
		net: (url, headers) => {
			const one = { url, headers };
			seen.push(one);
			const route = routes[url];
			if (route === undefined) {
				return Promise.resolve(html("not found", 404));
			}
			return Promise.resolve(typeof route === "function" ? route(one) : route);
		}
	};
}

/** What a test scripts about the browser and the person at the prompt. */
export interface Options {
	interactive?: boolean;
	render?: (url: string, call: number) => string | null;
	solved?: () => void;
	noChrome?: boolean;
}

/** A scripted Chrome that records each render and solve it is asked for. */
function fakeChrome(
	options: Options,
	renders: string[],
	solves: string[]
): Chrome {
	return {
		render: (url) => {
			renders.push(url);
			return Promise.resolve(
				options.render?.(url, renders.length) ?? undefined
			);
		},
		solve: (url) => {
			solves.push(url);
			options.solved?.();
			return Promise.resolve();
		}
	};
}

/** In-memory files and jar, a scripted Chrome, and a person who is or is not present. */
export function fakeDeps(
	net: FetchDeps["net"],
	options: Options = {}
): {
	deps: FetchDeps;
	files: Map<string, string>;
	notices: string[];
	renders: string[];
	solves: string[];
} {
	const files = new Map<string, string>();
	const notices: string[] = [];
	const renders: string[] = [];
	const solves: string[] = [];
	let jar = {};
	const deps: FetchDeps = {
		net,
		chrome:
			options.noChrome === true
				? undefined
				: fakeChrome(options, renders, solves),
		loadJar: () => Promise.resolve(jar),
		saveJar: (next) => {
			jar = next;
			return Promise.resolve();
		},
		interactive: options.interactive ?? false,
		notify: (text) => {
			notices.push(text);
			return Promise.resolve();
		},
		writeFile: (path, text) => {
			files.set(path, text);
			return Promise.resolve();
		},
		readFile: (path) => Promise.resolve(files.get(path)),
		saveDir: "/data/web"
	};
	return { deps, files, notices, renders, solves };
}
