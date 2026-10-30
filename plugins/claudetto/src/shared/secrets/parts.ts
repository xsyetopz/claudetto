export const TICK = "`";

export interface Entry {
	readonly id: string;
	readonly source: string;
	readonly flags?: string;
	readonly confidence: "low" | "high";
	readonly prefilter?: RegExp;
	readonly redactOnly?: true;
	readonly run?: string;
}

const HIDDEN =
	"\\u00ad\\u034f\\u061c\\u115f\\u1160\\u17b4\\u17b5\\u180b-\\u180f\\u200b-\\u200f\\u202a-\\u202e\\u2060-\\u206f\\u2800\\u3164\\ufe00-\\ufe0f\\uffa0\\ufff0-\\ufffb\\uDC00-\\uDFFF\\uDB40-\\uDB43";

const FORMAT = "\\u0600-\\u0605\\u06dd\\u070f\\u0890\\u0891\\u08e2";

const GAP = `[${HIDDEN}${FORMAT}\\ufeff]*`;

const LETTER_PAIR = /([a-z)])(?=[a-z([])/gi;
const OPTIONAL_SEPARATOR = /\[_-\]\?/g;

const loose = (source: string): string =>
	source
		.replace(LETTER_PAIR, `$1${GAP}`)
		.replace(OPTIONAL_SEPARATOR, `(?:[_-]${GAP})?`);

const NAME = loose(
	"api[_-]?key|secret|token|password|passwd|credential|bearer|authorization|auth[_-]?header|memory[_-]?request[_-]?mac|cookie|session[_-]?(?:id|key)|connection[_-]?string|(?:private|ssh|encryption|signing|access|deploy|master|license)[_-]?key|client[_-]?secret",
);

const SPACE = `[\\s\\u0085${HIDDEN}]`;

const WS = "[\\s\\u0085]";

const BREAK = "\\n\\r\\x0b\\x0c\\u0085\\u2028\\u2029";

export const AUTH_SCHEME = `(?:${loose("Bearer|Basic")})[${HIDDEN}]*[\\s\\u0085]+`;

/** Deviation: the backtick also ends the value, so a Markdown code span survives. */
const RUN = `[^\\s\\u0085,;&}\\])${TICK}]+`;

const NO_OPEN = "(?![\\w\\[({$/+=~!@%^?\\\\-])";

const PLAIN = "[^\\s\\u0085,;&})\"'\\\\]+";

const ESCAPED_QUOTED = `\\\\+(?:"[^"${BREAK}]*(?<!\\\\)(?=\\\\+")|'[^'${BREAK}]*(?<!\\\\)(?=\\\\+'))`;

/** Deviation: the masked alternative drops its trailing quote, so a second pass keeps the closing backtick. */
const VALUE = [
	`"[^"${BREAK}]*"`,
	`'[^'${BREAK}]*'`,
	`"[^"]*"${NO_OPEN}`,
	`'[^']*'${NO_OPEN}`,
	"[^\\s-]{0,4}\\[REDACTED\\]",
	`${AUTH_SCHEME}(?:\\[REDACTED\\]|${RUN})`,
	RUN,
].join("|");

const TAIL = "[\\w.-]{0,256}(?![\\w.-])";

const NO_SPACE_AFTER = `${WS}*(?!${WS})`;

const NAMED = `(?:${NAME})${TAIL}`;

const CLOUD_NAME = `\\b(?:${loose("AWS|GOOGLE|GCP|GCLOUD|AZURE")})${GAP}_\\w+`;

export const ASSIGN = `${NAMED}(?:${GAP}["'])?${SPACE}*[=:]${NO_SPACE_AFTER}(${VALUE})`;

export const CLOUD_ASSIGN = `${CLOUD_NAME}${SPACE}*[=:]${WS}*(${VALUE})`;

export const ESCAPED_ASSIGN = `${NAMED}${GAP}\\\\+["']${SPACE}*[=:]${NO_SPACE_AFTER}(${ESCAPED_QUOTED}|${AUTH_SCHEME}${PLAIN}|${PLAIN}|\\\\+["'][^\\s\\u0085,;&})"'\\\\]*)`;

export const ESCAPED_QUOTE = /\\["']/;

export const MASK_TAIL = `\\][^\\s"'>}|,;&${TICK})\\]]*`;

const B64 = "[A-Za-z0-9_-]";
const SEGMENT = `${B64}{10}${B64}*`;
const TWO_SEGMENTS = `\\.${SEGMENT}\\.${SEGMENT}`;

export const JWT = `(?<!${B64})(?=${B64}+${TWO_SEGMENTS})(?:${B64}*?-)??(eyJ${SEGMENT}${TWO_SEGMENTS})`;

export const GITLAB_BODY = "[\\w=-]{20,}(?:\\.[0-9a-z]{9})?";

export const BOUND = "(?:[\\x60'\"\\s;]|\\\\[nr]|$)";
