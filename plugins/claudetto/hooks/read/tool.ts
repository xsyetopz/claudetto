import type { EngineInterface, On } from "claude-code";

import { instructionsFor } from "../patch/instructions";
import { absolute } from "../patch/paths";
import { fault } from "../shared/fault";
import { fieldOf } from "../shared/field";
import { notebook, numbered } from "./render";
import { Repeats } from "./repeat";
import {
	CHARS_PER_TOKEN,
	DEFAULT_LIMIT,
	DEFAULT_MAX_TOKENS,
	MAX_PAGES,
	TOOL_DESCRIPTION,
	TOOL_FULL_NAME,
	TOOL_NAME
} from "./texts";

/** The `read` registration: in front of the model (not deferred), `file_path` required, `also` for more files. */
export const READ_TOOL = {
	name: TOOL_NAME,
	description: TOOL_DESCRIPTION,
	inputSchema: {
		type: "object",
		properties: {
			file_path: { type: "string" },
			offset: { type: "number" },
			limit: { type: "number" },
			pages: { type: "string" },
			also: { type: "array", items: { type: "string" } }
		},
		required: ["file_path"]
	},
	isDeferred: false
};

const IMAGES: Readonly<Record<string, string>> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp"
};

/**
 * Prints the requested pages of a PDF as JSON. PDFKit ships with macOS and
 * JXA runs through `osascript`, so no tool is installed; `pdftotext` is not on
 * a stock Mac.
 */
const PDF_SCRIPT = `ObjC.import("PDFKit");
function run(a) {
  const d = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(a[0]));
  if (d.isNil()) { return JSON.stringify({ error: "not a readable PDF" }); }
  const total = Number(d.pageCount);
  const to = Math.min(Number(a[2]), total);
  const pages = [];
  for (let i = Number(a[1]); i <= to; i++) {
    pages.push(ObjC.unwrap(d.pageAtIndex(i - 1).string) || "");
  }
  return JSON.stringify({ total, pages });
}`;

/** The 1-based page range a `pages` value names, or an error text. */
export function pageRange(
	pages: string | undefined
): { from: number; to: number } | { error: string } {
	if (pages === undefined || pages.trim() === "") {
		return { from: 1, to: MAX_PAGES };
	}
	const m = /^\s*(\d+)(?:\s*-\s*(\d+))?\s*$/u.exec(pages);
	const from = Number(m?.[1]);
	const to = Number(m?.[2] ?? m?.[1]);
	if (m === null || from < 1 || to < from) {
		return { error: `\`pages\` "${pages}" is not like 3 or 1-5` };
	}
	if (to - from + 1 > MAX_PAGES) {
		return { error: `\`pages\` spans over ${MAX_PAGES} pages` };
	}
	return { from, to };
}

async function pdfText(
	$: EngineInterface,
	path: string,
	pages: string | undefined
): Promise<string> {
	const range = pageRange(pages);
	if ("error" in range) {
		throw new Error(range.error);
	}
	const run = await $.process.run([
		"osascript",
		"-l",
		"JavaScript",
		"-e",
		PDF_SCRIPT,
		path,
		String(range.from),
		String(range.to)
	]);
	const out: unknown =
		run.exitCode === 0 ? JSON.parse(run.stdout.trim() || "null") : null;
	const error = fieldOf(out, "error");
	const body = fieldOf(out, "pages");
	const total = fieldOf(out, "total");
	if (typeof error === "string" || !Array.isArray(body)) {
		throw new TypeError(
			typeof error === "string"
				? error
				: `PDF text extraction failed: ${run.stderr.trim()}`
		);
	}
	const text = body
		.map(
			(p, i) =>
				`--- page ${range.from + i} of ${String(total)} ---\n${String(p).trim()}`
		)
		.join("\n\n");
	return text === ""
		? `(the PDF has ${String(total)} pages; none match)`
		: text;
}

const numberField = (input: unknown, key: string): number | undefined => {
	const v = fieldOf(input, key);
	return typeof v === "number" ? v : undefined;
};

/** What the file at `path` shows the model, by its extension: an image block, a PDF's text, cells or numbered lines. */
async function contentOf(
	$: EngineInterface,
	path: string,
	input: unknown,
	maxChars: number
): Promise<unknown> {
	const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
	const mime = IMAGES[ext];
	if (mime !== undefined) {
		const { base64 } = await $.fs.read(path, { as: "bytes" });
		return [
			{
				type: "image",
				source: { type: "base64", media_type: mime, data: base64 }
			}
		];
	}
	if (ext === "pdf") {
		const pages = fieldOf(input, "pages");
		return pdfText($, path, typeof pages === "string" ? pages : undefined);
	}
	const text = await $.fs.read(path);
	const cells = ext === "ipynb" ? notebook(text) : undefined;
	return (
		cells ??
		numbered(
			text,
			numberField(input, "offset"),
			numberField(input, "limit") ?? DEFAULT_LIMIT,
			maxChars
		)
	);
}

/** The characters one file's text may take: the built-in Read's token limit, as the environment sets it. */
async function maxCharsOf($: EngineInterface): Promise<number> {
	const raw = Number(
		await $.env.get("CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS")
	);
	const tokens = Number.isInteger(raw) && raw > 0 ? raw : DEFAULT_MAX_TOKENS;
	return tokens * CHARS_PER_TOKEN;
}

/** The paths of `also`, the strings only; anything else is no path. */
const alsoPaths = (input: unknown): string[] => {
	const also = fieldOf(input, "also");
	return Array.isArray(also)
		? also.filter((p): p is string => typeof p === "string" && p !== "")
		: [];
};

/** Every path a call reads: `file_path` first, then each of `also`. */
export function readPaths(input: unknown): string[] {
	const given = fieldOf(input, "file_path");
	return [
		...(typeof given === "string" && given !== "" ? [given] : []),
		...alsoPaths(input)
	];
}

const failure = (path: string, error: unknown): string =>
	`\`read\` failed for \`${path}\`: ${error instanceof Error ? error.message : String(error)}`;

const blocksOf = (content: unknown): unknown[] =>
	Array.isArray(content) ? content : [{ type: "text", text: String(content) }];

/** Joins each file's content: text under a `==> path <==` header, an image as its blocks. */
function joined(parts: readonly { path: string; content: unknown }[]): unknown {
	if (parts.length === 1) {
		return parts[0]?.content;
	}
	const blocks: unknown[] = parts.flatMap(({ path, content }): unknown[] => [
		{ type: "text", text: `==> ${path} <==` },
		...blocksOf(content)
	]);
	const texts = blocks.map((b) =>
		fieldOf(b, "type") === "text" ? fieldOf(b, "text") : undefined
	);
	return texts.every((t) => typeof t === "string") ? texts.join("\n") : blocks;
}

/**
 * Reads files for the model: numbered text lines, an image block, a notebook
 * as cells, or a PDF as text. The engine's tool result carries no PDF block,
 * so a PDF's text comes from macOS PDFKit. `also` reads more files whole in
 * the same call, because a call per file costs a model turn each.
 *
 * @param $ The engine.
 * @param input The call's `file_path`, `offset`, `limit`, `pages` and `also`.
 * @returns The result for the model, or the refusal.
 */
export async function runRead(
	$: EngineInterface,
	input: unknown
): Promise<{ deny: string } | { result: unknown }> {
	const given = fieldOf(input, "file_path");
	if (typeof given !== "string" || given === "") {
		return { deny: "`read` needs `file_path`" };
	}
	const cwd = await $.session.cwd();
	const path = absolute(cwd, given);
	const more = alsoPaths(input).map((p) => absolute(cwd, p));
	try {
		const maxChars = await maxCharsOf($);
		const first = await contentOf($, path, input, maxChars);
		// One missing file among several reads as its error, so the rest still arrive.
		const rest = await Promise.all(
			more.map(async (p) => ({
				path: p,
				content: await contentOf($, p, {}, maxChars).catch((error: unknown) =>
					failure(p, error)
				)
			}))
		);
		const content = joined([{ path, content: first }, ...rest]);
		// The built-in Read loads the file's path-scoped rules and nested CLAUDE.md; hiding it must not drop them.
		const context = await instructionsFor($, cwd, [path, ...more]);
		if (context.length === 0) {
			return { result: content };
		}
		const extra = context.join("\n\n");
		const blocks: unknown[] = Array.isArray(content) ? content : [];
		return {
			result: Array.isArray(content)
				? [...blocks, { type: "text", text: extra }]
				: `${String(content)}\n\n${extra}`
		};
	} catch (error) {
		return { deny: failure(path, error) };
	}
}

/** Declares `read`; settings/start.ts calls this from the one `session.start` hook core allows. */
export async function startRead($: EngineInterface): Promise<void> {
	try {
		await $.tool.register(READ_TOOL);
	} catch (error) {
		fault($, "read registration", error);
	}
}

/** Serves its calls; `registerReadCheck` gives it the built-in Read's verdict. A repeat read of unchanged text gets a short note once. */
export function registerRead(on: On): void {
	const repeats = new Repeats();
	on("tool.run", { tool: TOOL_FULL_NAME }, async ($, e) => {
		const r = await runRead($, e);
		return "result" in r
			? { result: repeats.answer(await $.session.id(), e, r.result) }
			: r;
	}).catch(($) => {
		$.ui.log("`read` failed", { to: "debug" });
		return { deny: "`read` failed; see the debug log" };
	});
	// Matched on any trigger: handover/compact.ts holds the one unmatched compaction hook.
	on("session.compact", { trigger: /^/u }, async (_$, e, next) => {
		const out = await next(e);
		repeats.clear();
		return out;
	}).catch(($, e, next) => {
		fault($, "read repeat reset", next.error);
		repeats.clear();
		return next(e);
	});
}
