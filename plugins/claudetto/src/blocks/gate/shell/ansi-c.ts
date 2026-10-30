const LETTERS: Record<string, string> = {
	a: "\x07",
	b: "\b",
	e: "\x1b",
	E: "\x1b",
	f: "\f",
	n: "\n",
	r: "\r",
	t: "\t",
	v: "\v",
	"\\": "\\",
	"'": "'",
	'"': '"',
	"?": "?",
};

const NUMBERS: [string, RegExp, number][] = [
	["x", /^[0-9A-Fa-f]{1,2}/, 16],
	["u", /^[0-9A-Fa-f]{1,4}/, 16],
	["U", /^[0-9A-Fa-f]{1,8}/, 16],
];

const OCTAL = /^[0-7]{1,3}/;

const charOf = (code: number): string =>
	code <= 0x10_ff_ff ? String.fromCodePoint(code) : "";

/** An octal escape gives one byte; an escape the shells do not know keeps its backslash. */
export const ansiEscape = (
	text: string,
	at: number,
): { char: string; last: number } => {
	const c = text.charAt(at);
	const known = Object.hasOwn(LETTERS, c) ? LETTERS[c] : undefined;
	if (known !== undefined) {
		return { char: known, last: at };
	}
	const octal = OCTAL.exec(text.slice(at, at + 3));
	if (octal) {
		return {
			char: charOf(Number.parseInt(octal[0], 8) & 0xff),
			last: at + octal[0].length - 1,
		};
	}
	for (const [letter, digits, base] of NUMBERS) {
		const m = c === letter && digits.exec(text.slice(at + 1, at + 9));
		if (m) {
			return {
				char: charOf(Number.parseInt(m[0], base)),
				last: at + m[0].length,
			};
		}
	}
	if (c === "c" && at + 1 < text.length) {
		return {
			char: charOf((text.codePointAt(at + 1) ?? 0) & 0x1f),
			last: at + 1,
		};
	}
	return { char: `\\${c}`, last: at };
};
