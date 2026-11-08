// The smallest YAML reader that serves `.openspec.yaml` and a project's `schema.yaml`: top-level
// keys with scalar, flow, or block values. Nested content is skipped, not read.
// Why not a library: a hooks module has no Bun or Node API and the engine loads only its own files.
const KEY =
	/^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^\s"'#\-[\]{}][^:]*?|-[^\s:][^:]*?)[ \t]*:(?:[ \t]+(.*))?$/;
const COMMENT = /(?:^|[ \t])#.*$/;
const TRUE = /^(?:true|True|TRUE)$/;
const FALSE = /^(?:false|False|FALSE)$/;
const NUMBER = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/;
const MAPPING_IN_SCALAR = /:(?:\s|$)/;
const INVALID = Symbol("invalid");

const BRACKET_DELTA: Record<string, number> = {
	"[": 1,
	"{": 1,
	"]": -1,
	"}": -1,
};

const nextQuote = (quote: string, ch: string) => {
	if (quote) {
		return ch === quote ? "" : quote;
	}
	return ch === '"' || ch === "'" ? ch : "";
};

const balanced = (text: string) => {
	let depth = 0;
	let quote = "";
	for (const ch of text) {
		depth += quote ? 0 : (BRACKET_DELTA[ch] ?? 0);
		quote = nextQuote(quote, ch);
	}
	return depth === 0 && quote === "";
};

const quoted = (text: string): unknown => {
	if (text.startsWith('"')) {
		try {
			return JSON.parse(text);
		} catch {
			return INVALID;
		}
	}
	return text.length > 1 && text.endsWith("'")
		? text.slice(1, -1).replaceAll("''", "'")
		: INVALID;
};

const plain = (text: string): unknown => {
	if (TRUE.test(text)) {
		return true;
	}
	if (FALSE.test(text)) {
		return false;
	}
	return NUMBER.test(text) ? Number(text) : text;
};

const scalar = (raw: string): unknown => {
	const text = raw.replace(COMMENT, "").trim();
	if (text === "" || text === "~" || text === "null") {
		return null;
	}
	if (text.startsWith('"') || text.startsWith("'")) {
		return quoted(text);
	}
	if (text.startsWith("[") || text.startsWith("{")) {
		return balanced(text) ? [] : INVALID;
	}
	return plain(text);
};

const INDENTED = /^\s/;
const LINE_BREAKS = /\r\n?/g;

const keyOf = (raw: string) => {
	const value = scalar(raw);
	return typeof value === "string" ? value : INVALID;
};

// An indented line under a scalar continues it, and a mapping cannot start inside one; under an
// empty value it opens a list or a map, which is not read further.
const continued = (held: unknown, line: string) => {
	if (held === null) {
		return line.startsWith("- ") ? [] : {};
	}
	return typeof held !== "object" && MAPPING_IN_SCALAR.test(line)
		? INVALID
		: held;
};

// Reads one unindented line into `out`; returns the new last key, `null` for a non-map document,
// or `false` when the line is not valid YAML.
const keyLine = (
	out: Record<string, unknown>,
	body: string,
	last: string | undefined,
) => {
	const m = KEY.exec(body.trimEnd());
	if (!m) {
		return last === undefined && balanced(body) ? null : false;
	}
	const key = keyOf(m[1] ?? "");
	const value = scalar(m[2] ?? "");
	if (key === INVALID || value === INVALID) {
		return false;
	}
	out[key] = value;
	return key;
};

// Folds an indented line into the value of the last key; false when it cannot belong there.
const indentedLine = (
	out: Record<string, unknown>,
	last: string | undefined,
	body: string,
) => {
	if (last === undefined) {
		return false;
	}
	const next = continued(out[last], body.trim());
	if (next === INVALID) {
		return false;
	}
	out[last] = next;
	return true;
};

/** The top-level map; `null` for a document that is no map; `undefined` when it is not valid YAML. */
export const parseYaml = (
	text: string,
): Record<string, unknown> | null | undefined => {
	const out: Record<string, unknown> = {};
	let last: string | undefined;
	for (const line of text.replace(LINE_BREAKS, "\n").split("\n")) {
		const body = line.replace(COMMENT, "");
		if (body.trim() === "" || body.trim() === "---") {
			continue;
		}
		if (INDENTED.test(body)) {
			if (!indentedLine(out, last, body)) {
				return undefined;
			}
			continue;
		}
		const key = keyLine(out, body, last);
		if (key === false) {
			return undefined;
		}
		if (key === null) {
			return null;
		}
		last = key;
	}
	return out;
};
