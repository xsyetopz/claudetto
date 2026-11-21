/** `a/{b,c}/d` as `a/b/d` and `a/c/d`; nested lists expand too. */
export const expandBraces = (glob: string): string[] => {
	const open = glob.indexOf("{");
	if (open === -1) {
		return [glob];
	}
	let depth = 0;
	const cuts: number[] = [open];
	for (let i = open; i < glob.length; i++) {
		const c = glob.charAt(i);
		if (c === "{") {
			depth++;
		} else if (c === "," && depth === 1) {
			cuts.push(i);
		} else if (c === "}" && --depth === 0) {
			cuts.push(i);
			const head = glob.slice(0, open);
			const tail = glob.slice(i + 1);
			return cuts
				.slice(0, -1)
				.flatMap((from, k) =>
					expandBraces(`${head}${glob.slice(from + 1, cuts[k + 1])}${tail}`)
				);
		}
	}
	return [glob];
};

/** One brace-free glob as a regular expression over a `/`-separated relative path. */
const globPattern = (glob: string): RegExp => {
	let source = "";
	for (let i = 0; i < glob.length; i++) {
		const c = glob.charAt(i);
		if (c === "*" && glob.charAt(i + 1) === "*") {
			const slash = glob.charAt(i + 2) === "/";
			source += slash ? "(?:.*/)?" : ".*";
			i += slash ? 2 : 1;
		} else if (c === "*") {
			source += "[^/]*";
		} else if (c === "?") {
			source += "[^/]";
		} else {
			source += c.replaceAll(/[.+^${}()|\\[\]]/gu, String.raw`\$&`);
		}
	}
	return new RegExp(`^${source}$`, "u");
};

/** Whether a relative path matches any of the globs, braces expanded. */
export const matchesGlobs = (globs: readonly string[], rel: string): boolean =>
	globs
		.flatMap((glob) => expandBraces(glob))
		.some((glob) => globPattern(glob).test(rel));

/** A rule file split into its `paths` globs (none when it has no `paths`) and its text. */
export interface Rule {
	globs: string[];
	text: string;
}

const unquote = (item: string): string =>
	item.trim().replace(/^(["'])(.*)\1$/u, "$2");

/** The `paths` globs of a frontmatter block: a YAML list, a flow list or a comma string. */
const pathsOf = (front: string): string[] => {
	const lines = front.split("\n");
	const at = lines.findIndex((l) => /^paths\s*:/u.test(l));
	if (at === -1) {
		return [];
	}
	const inline = (lines[at] ?? "").replace(/^paths\s*:/u, "").trim();
	if (inline !== "") {
		const body = inline.replace(/^\[(.*)\]$/u, "$1");
		// A brace list inside a glob keeps its commas.
		const items: string[] = [];
		let depth = 0;
		let item = "";
		for (const c of body) {
			if (c === "{") {
				depth++;
			} else if (c === "}") {
				depth--;
			}
			if (c === "," && depth === 0) {
				items.push(item);
				item = "";
			} else {
				item += c;
			}
		}
		items.push(item);
		return items.map((g) => unquote(g)).filter((g) => g !== "");
	}
	const globs: string[] = [];
	for (const line of lines.slice(at + 1)) {
		const m = /^\s+-\s+(.*)$/u.exec(line);
		if (m === null) {
			break;
		}
		globs.push(unquote(m[1] ?? ""));
	}
	return globs.filter((g) => g !== "");
};

/**
 * Splits a rule file into its `paths` globs and its body, with the
 * frontmatter and block HTML comments removed, as the engine strips them.
 */
export const parseRule = (source: string): Rule => {
	const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/u.exec(source);
	const body = m === null ? source : source.slice(m[0].length);
	return {
		globs: m === null ? [] : pathsOf((m[1] ?? "").replaceAll("\r", "")),
		text: stripComments(body)
	};
};

/** Text with block HTML comments (`<!-- ... -->`) removed. */
export const stripComments = (text: string): string =>
	text.replaceAll(/<!--[\s\S]*?-->\n?/gu, "").trim();
