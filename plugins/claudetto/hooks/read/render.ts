import { DEFAULT_LIMIT, MAX_LINE } from "./texts";

/**
 * The `cat -n` form of a window of `text`: each line behind its 1-based number
 * and a tab, lines past {@link MAX_LINE} characters cut.
 *
 * @param text The file's text.
 * @param offset The first line to show, 1-based (default 1).
 * @param limit The most lines to show (default {@link DEFAULT_LIMIT}).
 * @returns The numbered lines, with a closing note when more lines follow or none match.
 */
export function numbered(
	text: string,
	offset = 1,
	limit = DEFAULT_LIMIT
): string {
	if (text === "") {
		return "(the file is empty)";
	}
	const lines = text.replace(/\r?\n$/u, "").split(/\r?\n/u);
	const start = Math.max(1, Math.floor(offset));
	const window = lines.slice(start - 1, start - 1 + Math.max(1, limit));
	if (window.length === 0) {
		return `(offset ${start} is past the end: the file has ${lines.length} lines)`;
	}
	const shown = window.map((line, i) => {
		const cut =
			line.length > MAX_LINE ? `${line.slice(0, MAX_LINE)}… [line cut]` : line;
		return `${String(start + i).padStart(6)}\t${cut}`;
	});
	const next = start + window.length;
	if (next <= lines.length) {
		shown.push(
			`(${lines.length - next + 1} more lines; continue with offset ${next})`
		);
	}
	return shown.join("\n");
}

type Json = Record<string, unknown>;

const isJson = (value: unknown): value is Json =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** A notebook field that holds text as a string or an array of line strings. */
function textOf(value: unknown): string {
	if (Array.isArray(value)) {
		return value.filter((v) => typeof v === "string").join("");
	}
	return typeof value === "string" ? value : "";
}

/** One cell output as text, with an omission note for an image. */
function outputOf(out: Json): string {
	if (out["output_type"] === "stream") {
		return textOf(out["text"]);
	}
	if (out["output_type"] === "error") {
		return `${textOf(out["ename"])}: ${textOf(out["evalue"])}`;
	}
	const data = isJson(out["data"]) ? out["data"] : {};
	const plain = textOf(data["text/plain"]);
	const image = Object.keys(data).some((k) => k.startsWith("image/"));
	return [plain, image ? "[image output omitted]" : ""]
		.filter((s) => s !== "")
		.join("\n");
}

/**
 * A notebook as text: each cell under its index and type, its source, then its
 * outputs.
 *
 * @param json The `.ipynb` file's text.
 * @returns The rendering, or undefined when the text is no notebook.
 */
export function notebook(json: string): string | undefined {
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		return undefined;
	}
	if (!isJson(parsed) || !Array.isArray(parsed["cells"])) {
		return undefined;
	}
	return parsed["cells"]
		.filter((c) => isJson(c))
		.map((cell, i) => {
			const outputs = (Array.isArray(cell["outputs"]) ? cell["outputs"] : [])
				.filter((o) => isJson(o))
				.map((o) => outputOf(o))
				.filter((s) => s !== "")
				.map((s) => s.trimEnd());
			return [
				`# Cell ${i} [${textOf(cell["cell_type"])}]`,
				textOf(cell["source"]).trimEnd(),
				...(outputs.length === 0 ? [] : ["## Output", ...outputs])
			].join("\n");
		})
		.join("\n\n");
}
