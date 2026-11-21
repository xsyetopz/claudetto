import { block } from "./convert";
import { decodeEntities, descendants, parseHtml, textOf } from "./html";
import { pickMain, strip } from "./select";

/** The readable parts of a page. */
export interface Page {
	title: string;
	/** Compact Markdown of the main content. */
	markdown: string;
}

/**
 * Turns an HTML document into its title and the Markdown of its main
 * content: furniture dropped, the densest article or main block kept, links
 * resolved against `baseUrl` and each destination linked once.
 *
 * @param html The page source.
 * @param baseUrl The page's URL, to resolve relative links.
 */
export function extractPage(html: string, baseUrl: string): Page {
	const root = parseHtml(html);
	const titleEl = descendants(root).find((d) => d.tag === "title");
	let title = titleEl ? decodeEntities(textOf(titleEl)).trim() : "";
	const body = descendants(root).find((d) => d.tag === "body") ?? root;
	strip(body);
	const main = pickMain(body);
	const out: string[] = [];
	block(main, { base: baseUrl, seenLinks: new Set() }, out);
	let markdown = out
		.join("\n\n")
		.replaceAll(/\n{3,}/gu, "\n\n")
		.trim();
	if (title === "") {
		title = /^#\s+(.+)$/mu.exec(markdown)?.[1] ?? "";
	}
	if (title !== "" && !/^#\s/u.test(markdown)) {
		markdown = `# ${title}\n\n${markdown}`.trim();
	}
	return { title, markdown };
}
