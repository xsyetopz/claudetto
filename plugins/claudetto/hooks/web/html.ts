/** An element of the parsed page. */
export interface Element {
	kind: "element";
	tag: string;
	attrs: Record<string, string>;
	children: Node[];
	parent: Element | null;
}

/** A run of text between tags, entities decoded. */
export interface Text {
	kind: "text";
	text: string;
}

/** One node of the parsed page. */
export type Node = Element | Text;

const VOID = new Set([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr"
]);

/** Elements whose content is not markup, so a `<` inside them is text. */
const RAW = new Set(["script", "style", "textarea", "title"]);

/** Elements that close an open `<p>` or `<li>` when they start. */
const CLOSES_P = new Set([
	"address",
	"article",
	"aside",
	"blockquote",
	"div",
	"dl",
	"fieldset",
	"footer",
	"form",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"header",
	"hr",
	"main",
	"nav",
	"ol",
	"p",
	"pre",
	"section",
	"table",
	"ul"
]);

const NAMED: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
	ndash: "–",
	mdash: "—",
	hellip: "…",
	lsquo: "‘",
	rsquo: "’",
	ldquo: "“",
	rdquo: "”",
	copy: "©",
	reg: "®",
	trade: "™",
	middot: "·",
	bull: "•",
	laquo: "«",
	raquo: "»",
	times: "×",
	rarr: "→",
	larr: "←"
};

/** Decodes the HTML character references in `text`; an unknown name stays as written. */
export function decodeEntities(text: string): string {
	return text.replaceAll(
		/&(#x[\dA-F]+|#\d+|[A-Z][A-Z\d]*);/giu,
		(whole, body: string) => {
			if (body.startsWith("#")) {
				const code =
					body[1]?.toLowerCase() === "x"
						? Number.parseInt(body.slice(2), 16)
						: Math.trunc(Number(body.slice(1)));
				return code > 0 && code <= 1_114_111
					? String.fromCodePoint(code)
					: whole;
			}
			return NAMED[body.toLowerCase()] ?? whole;
		}
	);
}

const ATTR = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/gu;

function parseAttrs(source: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	for (const m of source.matchAll(ATTR)) {
		const name = (m[1] ?? "").toLowerCase();
		if (!(name in attrs)) {
			attrs[name] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
		}
	}
	return attrs;
}

const TOKEN =
	/<!--[\s\S]*?(?:-->|$)|<![^>]*>|<\?[^>]*>|<\/([a-z][^\s>/]*)[^>]*>|<([a-z][^\s>/]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>|[^<]+|</giu;

/** The open element and the raw-text element being skipped, while one is. */
interface Cursor {
	current: Element;
	rawUntil: string | null;
}

/** Closes the nearest open element named in `names`, if any is open. */
function closeTo(cursor: Cursor, names: readonly string[]): void {
	for (
		let node: Element | null = cursor.current;
		node?.parent;
		node = node.parent
	) {
		if (names.includes(node.tag)) {
			cursor.current = node.parent;
			return;
		}
	}
}

/** Closes the sibling an incoming `tag` implicitly ends: `<p>`, `<li>`, cells and rows. */
function closeImplied(cursor: Cursor, tag: string): void {
	const open = cursor.current.tag;
	const up = cursor.current.parent;
	if (up === null) {
		return;
	}
	if (
		(open === "p" && (tag === "p" || CLOSES_P.has(tag))) ||
		(open === "li" && tag === "li") ||
		((open === "td" || open === "th") && (tag === "td" || tag === "th"))
	) {
		cursor.current = up;
	} else if (tag === "tr" && ["td", "th", "tr"].includes(open)) {
		closeTo(cursor, ["tr"]);
	}
}

function openElement(cursor: Cursor, tag: string, attrSource: string): void {
	closeImplied(cursor, tag);
	const el: Element = {
		kind: "element",
		tag,
		attrs: parseAttrs(attrSource),
		children: [],
		parent: cursor.current
	};
	cursor.current.children.push(el);
	if (!VOID.has(tag) && !attrSource.endsWith("/")) {
		cursor.current = el;
		if (RAW.has(tag)) {
			cursor.rawUntil = tag;
		}
	}
}

function addText(cursor: Cursor, text: string): void {
	if (text !== "") {
		cursor.current.children.push({ kind: "text", text });
	}
}

/**
 * Parses HTML into a forgiving tree: unknown tags nest, a stray end tag is
 * dropped, and `<p>`, `<li>` and table cells close on their next sibling.
 * Real pages are rarely well formed, so no input throws.
 */
export function parseHtml(html: string): Element {
	const root: Element = {
		kind: "element",
		tag: "#root",
		attrs: {},
		children: [],
		parent: null
	};
	const cursor: Cursor = { current: root, rawUntil: null };
	TOKEN.lastIndex = 0;
	for (let m = TOKEN.exec(html); m !== null; m = TOKEN.exec(html)) {
		const [token, endTag, startTag, attrSource] = m;
		if (cursor.rawUntil !== null) {
			// Inside script or style only the matching end tag ends the run.
			if (endTag?.toLowerCase() === cursor.rawUntil) {
				cursor.rawUntil = null;
				closeTo(cursor, [endTag.toLowerCase()]);
			} else {
				addText(cursor, token);
			}
		} else if (endTag !== undefined) {
			closeTo(cursor, [endTag.toLowerCase()]);
		} else if (startTag !== undefined) {
			openElement(cursor, startTag.toLowerCase(), attrSource ?? "");
		} else if (!token.startsWith("<!") && !token.startsWith("<?")) {
			addText(cursor, token === "<" ? "<" : decodeEntities(token));
		}
	}
	return root;
}

/** The concatenated text under `node`, entities already decoded. */
export function textOf(node: Node): string {
	if (node.kind === "text") {
		return node.text;
	}
	return node.children.map((c) => textOf(c)).join("");
}

/** Every element under `node`, document order, `node` itself excluded. */
export function descendants(node: Element): Element[] {
	const out: Element[] = [];
	const walk = (n: Element): void => {
		for (const c of n.children) {
			if (c.kind === "element") {
				out.push(c);
				walk(c);
			}
		}
	};
	walk(node);
	return out;
}

/** Whether `el` carries `word` among its space-separated class names. */
export function hasClass(el: Element, word: string): boolean {
	return (el.attrs["class"] ?? "").split(/\s+/u).includes(word);
}

/** Removes `el` from its parent. */
export function detach(el: Element): void {
	if (el.parent) {
		el.parent.children = el.parent.children.filter((c) => c !== el);
		el.parent = null;
	}
}
