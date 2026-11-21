import { descendants, detach, type Element, textOf } from "./html";

/** Elements that carry no readable content. */
const DROP = new Set([
	"script",
	"style",
	"noscript",
	"svg",
	"iframe",
	"template",
	"canvas",
	"form",
	"button",
	"select",
	"nav",
	"footer",
	"aside",
	"dialog",
	"head"
]);

/** Class or id words that mark page furniture rather than content. */
const FURNITURE =
	/(?:^|[\s_-])(?:nav|navbar|navigation|menu|sidebar|footer|cookie|cookies|consent|advert|ads|promo|breadcrumbs?|share|social|newsletter|modal|popup)(?:$|[\s_-])/iu;

const CANDIDATES = new Set(["article", "main", "section", "div", "td"]);

/** Elements whose class or id words never mark them as furniture. */
const PAGE_BLOCKS = new Set(["body", "html", "main", "article"]);

function isFurniture(el: Element): boolean {
	if (DROP.has(el.tag)) {
		return true;
	}
	const role = el.attrs["role"] ?? "";
	if (["navigation", "banner", "contentinfo", "complementary"].includes(role)) {
		return true;
	}
	if (el.attrs["hidden"] !== undefined || el.attrs["aria-hidden"] === "true") {
		return true;
	}
	if (/display:\s*none/iu.test(el.attrs["style"] ?? "")) {
		return true;
	}
	// A page-wide wrapper named "menu-open" must not take the content with it, so
	// the word test only applies to elements that are not the page's main block.
	return (
		!PAGE_BLOCKS.has(el.tag) &&
		FURNITURE.test(`${el.attrs["class"] ?? ""} ${el.attrs["id"] ?? ""}`)
	);
}

/** Removes furniture below `root`; a `<header>` stays when it holds a heading. */
export function strip(root: Element): void {
	for (const el of descendants(root)) {
		if (el.parent === null) {
			continue;
		}
		const isHeaderWithHeading =
			el.tag === "header" &&
			descendants(el).some((d) => /^h[1-3]$/u.test(d.tag));
		if (el.tag === "header" ? !isHeaderWithHeading : isFurniture(el)) {
			detach(el);
		}
	}
}

/** Characters of anchor text under `el`. */
export function linkText(el: Element): number {
	let sum = 0;
	for (const d of descendants(el)) {
		if (d.tag === "a") {
			sum += textOf(d).trim().length;
		}
	}
	return sum;
}

/** Link-free text length, the density the readability pick scores by. */
function score(el: Element): number {
	const total = textOf(el).replaceAll(/\s+/gu, " ").trim().length;
	return total - 2 * linkText(el);
}

function depth(el: Element): number {
	let d = 0;
	for (let n = el.parent; n; n = n.parent) {
		d += 1;
	}
	return d;
}

function bestScoring(first: Element, rest: Element[]): Element {
	let best = first;
	for (const el of rest) {
		if (score(el) > score(best)) {
			best = el;
		}
	}
	return best;
}

/**
 * Picks the main block: the best-scoring `main` or `article` when the page
 * names one, else the deepest block that still holds three quarters of the
 * densest block's text, since a wrapper always outscores the article inside it.
 */
export function pickMain(body: Element): Element {
	const all = descendants(body);
	const named = all.filter(
		(d) => d.tag === "main" || d.tag === "article" || d.attrs["role"] === "main"
	);
	const [first, ...rest] = named;
	if (first !== undefined) {
		return bestScoring(first, rest);
	}
	const scored = all
		.filter((d) => CANDIDATES.has(d.tag))
		.map((el) => ({ el, s: score(el) }));
	const top = Math.max(score(body), ...scored.map((c) => c.s));
	let best = body;
	let bestDepth = 0;
	for (const { el, s } of scored) {
		if (s >= top * 0.75 && depth(el) > bestDepth) {
			best = el;
			bestDepth = depth(el);
		}
	}
	return best;
}
