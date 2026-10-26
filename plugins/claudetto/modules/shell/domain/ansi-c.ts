// The escapes of an ANSI-C quote (`$'...'`) of bash and zsh, for `scan.ts`.

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

/** The escapes of a number: the letter after the backslash, the digits, and their base. */
const NUMBERS: [string, RegExp, number][] = [
  ["x", /^[0-9A-Fa-f]{1,2}/, 16],
  ["u", /^[0-9A-Fa-f]{1,4}/, 16],
  ["U", /^[0-9A-Fa-f]{1,8}/, 16],
];

/** The character of a code point, or `""` for a number that is not a code point. */
const charOf = (code: number): string =>
  code <= 0x10ffff ? String.fromCodePoint(code) : "";

/**
 * The text of the escape that starts at `text[at]`, the character after the backslash, and the index of its last character.
 * An octal escape gives one byte, and an escape that the shells do not know keeps its backslash.
 */
export const ansiEscape = (
  text: string,
  at: number,
): { char: string; last: number } => {
  const c = text[at] as string;
  if (Object.hasOwn(LETTERS, c))
    return { char: LETTERS[c] as string, last: at };
  const octal = /^[0-7]{1,3}/.exec(text.slice(at, at + 3));
  if (octal)
    return {
      char: charOf(Number.parseInt(octal[0], 8) & 0xff),
      last: at + octal[0].length - 1,
    };
  for (const [letter, digits, base] of NUMBERS) {
    const m = c === letter && digits.exec(text.slice(at + 1, at + 9));
    if (m)
      return {
        char: charOf(Number.parseInt(m[0], base)),
        last: at + m[0].length,
      };
  }
  if (c === "c" && at + 1 < text.length)
    return {
      char: charOf((text.codePointAt(at + 1) ?? 0) & 0x1f),
      last: at + 1,
    };
  return { char: `\\${c}`, last: at };
};
