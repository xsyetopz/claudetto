// The shared pattern parts of the secret detector of Claude Code `2.1.312`, module
// `chunk-45pm9m17.js`. Every part is transcribed from that bundle and none is written from memory:
// the invisible classes `g1e` and `Cto` at offset 4,668, the gap `jlt` and the loosener `$5e` just
// after them, the sensitive names `mt` at 48,918, and the value parts between `mt` and the table
// `Vn` at 50,774. The module name and the offsets hold for that build alone, because the bundle
// splits by build.
//
// One rule holds for the text below, so that a reader can set it beside the bundle: each pattern is
// an ordinary string or template with every backslash doubled, which is how the bundle writes its
// own literals. A `String.raw` template would read more easily and is not used, because a code point
// written as a character rather than as an escape is invisible on the page, and because the one
// repository check that reads these files reads their text. The two deviations from the program are
// marked where they are.

/** The backtick, which a class takes by name so that no template has to hold one. */
export const TICK = "`";

/**
 * One row of the table `Vn`, with the fields the redaction path reads. `displayRun` is left out,
 * because only `Yi()` reads it and only `redactForDisplay` calls that; the redaction path compiles
 * the table through `be(true)`, which ignores the field.
 */
export interface Entry {
	readonly id: string;
	readonly source: string;
	readonly flags?: string;
	readonly confidence: "low" | "high";
	/** A cheap test that must pass before the pattern is run. */
	readonly prefilter?: RegExp;
	/** An entry the program runs only when it redacts, never when it reports a finding. */
	readonly redactOnly?: true;
	/** The run that the compiler wraps the source in, so a longer token is not half-matched. */
	readonly run?: string;
}

/** `g1e`: the invisible code points. */
const HIDDEN =
	"\\u00ad\\u034f\\u061c\\u115f\\u1160\\u17b4\\u17b5\\u180b-\\u180f\\u200b-\\u200f\\u202a-\\u202e\\u2060-\\u206f\\u2800\\u3164\\ufe00-\\ufe0f\\uffa0\\ufff0-\\ufffb\\uDC00-\\uDFFF\\uDB40-\\uDB43";

/** `Cto`: the ignorable format characters that `jlt` adds to `g1e`. */
const FORMAT = "\\u0600-\\u0605\\u06dd\\u070f\\u0890\\u0891\\u08e2";

/** `jlt`: a run of invisible characters, which the program allows inside a name. */
const GAP = `[${HIDDEN}${FORMAT}\\ufeff]*`;

const LETTER_PAIR = /([a-z)])(?=[a-z([])/gi;
const OPTIONAL_SEPARATOR = /\[_-\]\?/g;

/** `$5e`: it lets an invisible character sit between two letters, so `pa​ssword` matches too. */
const loose = (source: string): string =>
	source
		.replace(LETTER_PAIR, `$1${GAP}`)
		.replace(OPTIONAL_SEPARATOR, `(?:[_-]${GAP})?`);

/** `mt`: the names the program treats as sensitive. The table reads `mt.source`, which is this. */
const NAME = loose(
	"api[_-]?key|secret|token|password|passwd|credential|bearer|authorization|auth[_-]?header|memory[_-]?request[_-]?mac|cookie|session[_-]?(?:id|key)|connection[_-]?string|(?:private|ssh|encryption|signing|access|deploy|master|license)[_-]?key|client[_-]?secret",
);

/** `ge`: the space class of an assignment, which takes `g1e` and neither of the other two. */
const SPACE = `[\\s\\u0085${HIDDEN}]`;

/** `te`: plain white space. */
const WS = "[\\s\\u0085]";

/** `Be`: the line breaks that a quoted value may not cross. */
const BREAK = "\\n\\r\\x0b\\x0c\\u0085\\u2028\\u2029";

/** `oe`: the `Bearer` or `Basic` scheme and the space after it. */
export const AUTH_SCHEME = `(?:${loose("Bearer|Basic")})[${HIDDEN}]*[\\s\\u0085]+`;

/**
 * `Cn`: the unquoted value, with the backtick added to the characters that end it.
 *
 * The first deviation. A handoff is Markdown, and the program's class ends at no backtick, so the
 * closing backtick of `` `KEY=secret` `` would be taken into the value and the file would lose its
 * code span. The boundary group `BOUND` of the same table already names the backtick as a character
 * that ends a secret value, so the character is the program's own choice and only the place is ours.
 */
const RUN = `[^\\s\\u0085,;&}\\])${TICK}]+`;

/** `In`: what may not open right after a quoted value. */
const NO_OPEN = "(?![\\w\\[({$/+=~!@%^?\\\\-])";

/** `Dn`: the unbroken run of an escaped value. */
const PLAIN = "[^\\s\\u0085,;&})\"'\\\\]+";

/** `Bi`: a value inside escaped quotes. */
const ESCAPED_QUOTED = `\\\\+(?:"[^"${BREAK}]*(?<!\\\\)(?=\\\\+")|'[^'${BREAK}]*(?<!\\\\)(?=\\\\+'))`;

/**
 * `Ge`: the value of an assignment, quoted, already masked, or an unbroken run, in the program's
 * order.
 *
 * The second deviation. The program's masked alternative ends `\[REDACTED\]['"\x60]?`, and that
 * trailing quote is dropped here. The program's replacer puts a quote back only when the value both
 * opens and closes with one, so a second pass over `` `KEY=[REDACTED]` `` would swallow the closing
 * backtick and leave the code span of the handoff open.
 */
const VALUE = [
	`"[^"${BREAK}]*"`,
	`'[^'${BREAK}]*'`,
	`"[^"]*"${NO_OPEN}`,
	`'[^']*'${NO_OPEN}`,
	"[^\\s-]{0,4}\\[REDACTED\\]",
	`${AUTH_SCHEME}(?:\\[REDACTED\\]|${RUN})`,
	RUN,
].join("|");

/** `zi`: what may follow a sensitive name before the separator. */
const TAIL = "[\\w.-]{0,256}(?![\\w.-])";

/** `Wn`: the separator takes trailing space, and the value may not open with one. */
const NO_SPACE_AFTER = `${WS}*(?!${WS})`;

/** `yt`: a sensitive name with its tail. */
const NAMED = `(?:${NAME})${TAIL}`;

/** `Un`: a cloud environment variable, whose value the entry `cloud-env-var` reads. */
const CLOUD_NAME = `\\b(?:${loose("AWS|GOOGLE|GCP|GCLOUD|AZURE")})${GAP}_\\w+`;

/** `ct`: the source of the entry `sensitive-assign`. */
export const ASSIGN = `${NAMED}(?:${GAP}["'])?${SPACE}*[=:]${NO_SPACE_AFTER}(${VALUE})`;

/** `dt`: the source of the entry `cloud-env-var`. */
export const CLOUD_ASSIGN = `${CLOUD_NAME}${SPACE}*[=:]${WS}*(${VALUE})`;

/** `Kn`: the source of the entry `sensitive-assign-escaped`. */
export const ESCAPED_ASSIGN = `${NAMED}${GAP}\\\\+["']${SPACE}*[=:]${NO_SPACE_AFTER}(${ESCAPED_QUOTED}|${AUTH_SCHEME}${PLAIN}|${PLAIN}|\\\\+["'][^\\s\\u0085,;&})"'\\\\]*)`;

/** `Gn`: the prefilter of the entry `sensitive-assign-escaped`. */
export const ESCAPED_QUOTE = /\\["']/;

/** `zn`: the rest of a value whose head the program already masked. */
export const MASK_TAIL = `\\][^\\s"'>}|,;&${TICK})\\]]*`;

/** `Ee`, `ft`, and `Fn`: the segments of a web token. */
const B64 = "[A-Za-z0-9_-]";
const SEGMENT = `${B64}{10}${B64}*`;
const TWO_SEGMENTS = `\\.${SEGMENT}\\.${SEGMENT}`;

/** `bt`: the source of the entry `loose-jwt`. */
export const JWT = `(?<!${B64})(?=${B64}+${TWO_SEGMENTS})(?:${B64}*?-)??(eyJ${SEGMENT}${TWO_SEGMENTS})`;

/** `G` and `J`: the body after the `glpat-` or `gldt-` prefix of a GitLab token, which is 20 or more word, `=` or `-` characters and then an optional `.` with 9 more. */
export const GITLAB_BODY = "[\\w=-]{20,}(?:\\.[0-9a-z]{9})?";

/** `pt`: the boundary that each high source of the table ends with. */
export const BOUND = "(?:[\\x60'\"\\s;]|\\\\[nr]|$)";
