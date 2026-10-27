#!/usr/bin/env node
// Fails when a source file holds a lint or type suppression comment.
// Usage: bun .biome/check-suppressions.mjs [rootDir]
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { closeAt, simpleScanner } from "./comment-primitives.mjs";
import { jsScanner } from "./js-scanner.mjs";

const JS = ["js", "jsx", "mjs", "cjs", "ts", "tsx", "mts", "cts"];
const HTML = ["html", "htm", "vue", "svelte", "astro"];
const SKIPPED_DIRS = new Set(["node_modules", ".git", "dist"]);
const DIRECTIVE =
	/^[\s*]*(?:biome-ignore|@ts-ignore|@ts-nocheck|@ts-expect-error|eslint-disable|oxlint-disable)/;
const MARKUP_OPENER = /<!--|\{\/\*|<(script|style)\b[^>]*>/gi;
const MARKUP_CLOSER = /** @type {Record<string, string>} */ ({
	"<!--": "-->",
	"{/*": "*/",
});

const PATH_SEPARATOR = /[\\/]/;
const LINE_BREAK = /\r?\n/;
const execFileAsync = promisify(execFile);
const root = resolve(process.argv[2] ?? process.cwd());

/**
 * @typedef {import("./comment-primitives.mjs").Comment} Comment
 * @typedef {import("./comment-primitives.mjs").Scanner} Scanner
 */

/**
 * @param {string} file
 * @returns {string}
 */
const extensionOf = (file) => {
	const dot = file.lastIndexOf(".");
	return dot === -1 ? "" : file.slice(dot + 1).toLowerCase();
};

/**
 * @param {string} file
 * @returns {boolean}
 */
const isInsideBiomeDir = (file) =>
	file.split(PATH_SEPARATOR).includes(".biome");

/** @returns {Promise<string[] | null>} */
const gitFiles = async () => {
	try {
		const inside = await execFileAsync(
			"git",
			["rev-parse", "--is-inside-work-tree"],
			{ cwd: root, encoding: "utf8" },
		);
		if (inside.stdout.trim() !== "true") {
			return null;
		}
		const listed = await execFileAsync(
			"git",
			["ls-files", "-co", "--exclude-standard", "-z"],
			{ cwd: root, encoding: "utf8", maxBuffer: 1 << 28 },
		);
		return [...new Set(listed.stdout.split("\0").filter(Boolean))];
	} catch {
		return null;
	}
};

/**
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
const walk = async (dir) => {
	const entries = await readdir(dir, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map(async (entry) => {
			if (entry.isDirectory()) {
				return SKIPPED_DIRS.has(entry.name) ? [] : walk(join(dir, entry.name));
			}
			return entry.isFile()
				? [relative(root, join(dir, entry.name)).split(sep).join("/")]
				: [];
		}),
	);
	return nested.flat();
};

/** @returns {Promise<string[]>} */
const listFiles = async () => (await gitFiles()) ?? walk(root);

const cssScanner = simpleScanner("", true);

/** @type {Scanner} */
const htmlScanner = (src, from, to) => {
	/** @type {Comment[]} */
	const found = [];
	let next = from;
	if (from === 0 && src.startsWith("---")) {
		next = closeAt(src, "\n---", 3, to);
		found.push(...jsScanner(src, 3, next));
	}
	MARKUP_OPENER.lastIndex = next;
	for (
		let m = MARKUP_OPENER.exec(src);
		m && m.index < to;
		m = MARKUP_OPENER.exec(src)
	) {
		const at = m.index + m[0].length;
		const tag = m[1]?.toLowerCase();
		const end = closeAt(
			src,
			tag ? `</${tag}` : (MARKUP_CLOSER[m[0]] ?? "*/"),
			at,
			to,
		);
		if (tag) {
			found.push(...(tag === "script" ? jsScanner : cssScanner)(src, at, end));
		} else {
			found.push({ at, text: src.slice(at, end) });
		}
		MARKUP_OPENER.lastIndex = end;
	}
	return found;
};

/** @type {Map<string, Scanner>} */
const SCANNERS = new Map(
	/** @type {[string[], Scanner][]} */ ([
		[JS, jsScanner],
		[HTML, htmlScanner],
		[["css"], cssScanner],
		[["scss"], simpleScanner("//", true)],
		[["json", "jsonc"], simpleScanner("//", true)],
		[["graphql", "gql"], simpleScanner("#", false)],
	]).flatMap(([exts, scan]) => exts.map((ext) => [ext, scan])),
);

/**
 * Returns "path:line: text" for each directive that starts a line of a comment.
 * @param {string} file
 * @param {string} src
 * @param {Comment[]} comments
 * @returns {string[]}
 */
const hitsIn = (file, src, comments) => {
	const lines = src.split(LINE_BREAK);
	return comments.flatMap(({ at, text }) => {
		let offset = at;
		return text.split("\n").flatMap((part) => {
			const line = src.slice(0, offset).split("\n").length;
			offset += part.length + 1;
			return DIRECTIVE.test(part)
				? [`${file}:${line}: ${lines[line - 1]?.trim()}`]
				: [];
		});
	});
};

/**
 * @param {string} file
 * @returns {Promise<string[]>}
 */
const scanFile = async (file) => {
	const scan = SCANNERS.get(extensionOf(file));
	if (!scan || isInsideBiomeDir(file)) {
		return [];
	}
	/** @type {string} */
	let source;
	try {
		source = await readFile(join(root, file), "utf8");
	} catch {
		return [];
	}
	return hitsIn(file, source, scan(source, 0, source.length));
};

const hits = (await Promise.all((await listFiles()).map(scanFile))).flat();

if (hits.length > 0) {
	process.stdout.write(`${hits.join("\n")}\n`);
	process.stdout.write(
		"Remove each suppression comment above and fix the code it hides, then run this check again.\n",
	);
	process.exitCode = 1;
}
