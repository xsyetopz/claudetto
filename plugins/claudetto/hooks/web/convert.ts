import { descendants, type Element, type Node, textOf } from "./html";
import { linkText } from "./select";
import { markdownTable } from "./table";

/** State shared by one page's conversion. */
export interface Context {
	base: string;
	seenLinks: Set<string>;
}

const INLINE = new Set([
	"a",
	"abbr",
	"b",
	"br",
	"cite",
	"code",
	"em",
	"i",
	"img",
	"kbd",
	"mark",
	"q",
	"s",
	"small",
	"span",
	"strong",
	"sub",
	"sup",
	"time",
	"u"
]);

const clean = (text: string): string => text.replaceAll(/[\s ]+/gu, " ");

/** Converts a run of inline nodes to Markdown text. */
type Inline = (nodes: Node[], ctx: Context) => string;

/** Appends the paragraphs of one node to `out`. */
type Walk = (node: Node, ctx: Context, out: string[]) => void;

const isElement = (node: Node): node is Element => node.kind === "element";

function resolveUrl(href: string, base: string): string | null {
	if (
		/^\s*(?:javascript|mailto|tel|data):/iu.test(href) ||
		href.startsWith("#")
	) {
		return null;
	}
	try {
		return new URL(href, base).href;
	} catch {
		// An href that is no URL is skipped as a link; the throw is the answer.
		return null;
	}
}

function anchor(el: Element, ctx: Context, render: Inline): string {
	const text = render(el.children, ctx).trim();
	const url = resolveUrl(el.attrs["href"] ?? "", ctx.base);
	// A repeated destination reads as plain text: it is a nav or "read more" echo.
	if (text === "" || url === null || ctx.seenLinks.has(url)) {
		return text;
	}
	ctx.seenLinks.add(url);
	return `[${text.replaceAll(/[[\]]/gu, "")}](${url})`;
}

function wrap(text: string, mark: string): string {
	return text === "" ? "" : `${mark}${text}${mark}`;
}

function inlineElement(el: Element, ctx: Context, render: Inline): string {
	switch (el.tag) {
		case "br": {
			return "\n";
		}
		case "a": {
			return anchor(el, ctx, render);
		}
		case "strong":
		case "b": {
			return wrap(render(el.children, ctx).trim(), "**");
		}
		case "em":
		case "i": {
			return wrap(render(el.children, ctx).trim(), "*");
		}
		case "code": {
			return wrap(textOf(el).trim().replaceAll("`", "'"), "`");
		}
		case "img": {
			return "";
		}
		default: {
			return render(el.children, ctx);
		}
	}
}

function inline(nodes: Node[], ctx: Context): string {
	let out = "";
	for (const n of nodes) {
		out += n.kind === "text" ? clean(n.text) : inlineElement(n, ctx, inline);
	}
	return out;
}

function cell(c: Element, ctx: Context): string {
	return inline(c.children, ctx)
		.replaceAll(/\s+/gu, " ")
		.replaceAll("|", String.raw`\|`)
		.trim();
}

function table(el: Element, ctx: Context): string {
	const rows = descendants(el)
		.filter((d) => d.tag === "tr")
		.map((tr) =>
			tr.children
				.filter((c): c is Element => isElement(c) && /^t[dh]$/u.test(c.tag))
				.map((c) => cell(c, ctx))
		)
		.filter((r) => r.length > 0);
	return markdownTable(rows);
}

/** A list whose every item is only a link and that runs long is a menu, not content. */
function isLinkList(el: Element): boolean {
	const items = el.children.filter(
		(c): c is Element => isElement(c) && c.tag === "li"
	);
	if (items.length < 6) {
		return false;
	}
	return items.every((li) => {
		const text = textOf(li).trim().length;
		return text > 0 && linkText(li) >= text * 0.9;
	});
}

const isSubList = (c: Node): c is Element =>
	isElement(c) && (c.tag === "ul" || c.tag === "ol");

function list(el: Element, ctx: Context, level: number): string {
	const ordered = el.tag === "ol";
	let n = 0;
	const lines: string[] = [];
	for (const li of el.children) {
		if (!isElement(li) || li.tag !== "li") {
			continue;
		}
		n += 1;
		const nested = li.children.filter((c) => isSubList(c));
		const own = inline(
			li.children.filter((c) => !isSubList(c)),
			ctx
		)
			.replaceAll(/\s*\n\s*/gu, " ")
			.trim();
		const bullet = ordered ? `${n}.` : "-";
		lines.push(`${"  ".repeat(level)}${bullet} ${own}`);
		for (const sub of nested) {
			if (isElement(sub)) {
				lines.push(list(sub, ctx, level + 1));
			}
		}
	}
	return lines.join("\n");
}

function heading(el: Element, ctx: Context): string {
	const t = inline(el.children, ctx).replaceAll(/\s+/gu, " ").trim();
	return t === "" ? "" : `${"#".repeat(Number(el.tag.slice(1)))} ${t}`;
}

function preformatted(el: Element): string {
	const code = textOf(el).replace(/^\n/u, "").trimEnd();
	if (code === "") {
		return "";
	}
	const lang = /language-([\w+-]+)/u.exec(
		descendants(el).find((d) => d.tag === "code")?.attrs["class"] ?? ""
	)?.[1];
	return `\`\`\`${lang ?? ""}\n${code}\n\`\`\``;
}

function quote(el: Element, ctx: Context, walk: Walk): string {
	const inner: string[] = [];
	for (const c of el.children) {
		walk(c, ctx, inner);
	}
	if (inner.length === 0) {
		return "";
	}
	return inner
		.join("\n\n")
		.split("\n")
		.map((l) => `> ${l}`)
		.join("\n");
}

/** Joins the inline runs between child blocks into paragraphs. */
function children(el: Element, ctx: Context, out: string[], walk: Walk): void {
	let run: Node[] = [];
	const flush = (): void => {
		const t = inline(run, ctx)
			.replaceAll(/[ \t]+\n/gu, "\n")
			.trim();
		if (t !== "") {
			out.push(t);
		}
		run = [];
	};
	for (const c of el.children) {
		if (isElement(c) && !INLINE.has(c.tag)) {
			flush();
			walk(c, ctx, out);
		} else {
			run.push(c);
		}
	}
	flush();
}

/** The Markdown of one block element, or "" when it has none of its own. */
function blockText(el: Element, ctx: Context, walk: Walk): string {
	switch (el.tag) {
		case "h1":
		case "h2":
		case "h3":
		case "h4":
		case "h5":
		case "h6": {
			return heading(el, ctx);
		}
		case "pre": {
			return preformatted(el);
		}
		case "ul":
		case "ol": {
			return isLinkList(el) ? "" : list(el, ctx, 0);
		}
		case "table": {
			return table(el, ctx);
		}
		case "blockquote": {
			return quote(el, ctx, walk);
		}
		case "hr": {
			return "---";
		}
		default: {
			return "";
		}
	}
}

const OWN_TEXT = new Set([
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"pre",
	"ul",
	"ol",
	"table",
	"blockquote",
	"hr"
]);

/**
 * Appends the Markdown paragraphs of `node` to `out`.
 *
 * @param node The node to convert.
 * @param ctx The page's base URL and the links already shown.
 * @param out The paragraphs so far.
 */
export function block(node: Node, ctx: Context, out: string[]): void {
	if (node.kind === "text") {
		const t = clean(node.text).trim();
		if (t !== "") {
			out.push(t);
		}
		return;
	}
	if (!OWN_TEXT.has(node.tag)) {
		children(node, ctx, out, block);
		return;
	}
	const text = blockText(node, ctx, block);
	if (text !== "") {
		out.push(text);
	}
}
