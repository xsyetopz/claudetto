import { describe, expect, test } from "bun:test";
import { ICON } from "../icons.ts";
import { clean, plain, truncate, width } from "../width.ts";

const ESC = String.fromCharCode(27);
const BEL = String.fromCharCode(7);
const green = (text: string) => `${ESC}[38;2;78;186;101m${text}${ESC}[0m`;

describe("spacing: what a cell count must be", () => {
	test("every glyph of the line is one column whether the terminal draws ambiguous glyphs narrow or wide", () => {
		for (const glyph of Object.values(ICON)) {
			expect(
				globalThis.Bun.stringWidth(glyph, { ambiguousIsNarrow: true }),
			).toBe(1);
			expect(
				globalThis.Bun.stringWidth(glyph, { ambiguousIsNarrow: false }),
			).toBe(1);
			expect(width(glyph)).toBe(1);
		}
	});

	test("an East Asian ambiguous glyph counts as two, so a wide-drawing terminal never overflows", () => {
		for (const glyph of ["▲", "◆", "●", "▤", "↑", "…"]) {
			expect(width(glyph)).toBe(2);
		}
	});

	test("a private-use Nerd Font glyph counts as two", () => {
		expect(width("\ue0a0")).toBe(2);
	});

	test("a text symbol with an emoji presentation selector counts as two", () => {
		expect(width("❤")).toBe(1);
		expect(width("❤️")).toBe(2);
		expect(width("↔️")).toBe(2);
	});

	test("an emoji by default presentation, a flag, and a joined family count as two each", () => {
		for (const glyph of ["⚡", "🚀", "🇯🇵", "👨‍👩‍👧"]) {
			expect(width(glyph)).toBe(2);
		}
	});

	test("full-width text counts two per character and a combining mark counts none", () => {
		expect(width("日本")).toBe(4);
		expect(width("é")).toBe(1);
	});

	test("a color sequence counts as no column", () => {
		expect(width(green("abc"))).toBe(3);
		expect(width(`${ESC}[1m${ESC}[38;2;1;2;3mab${ESC}[0m`)).toBe(2);
	});

	test("an OSC 8 link counts only its label", () => {
		const link = `${ESC}]8;;https://a.test${BEL}label${ESC}]8;;${BEL}`;
		const stringTerminated = `${ESC}]8;;https://a.test${ESC}\\label${ESC}]8;;${BEL}`;
		expect(width(link)).toBe(5);
		expect(width(stringTerminated)).toBe(5);
		expect(plain(link)).toBe("label");
	});
});

describe("boundary: a cut never lands inside a sequence or a glyph", () => {
	test("the cut text fits the limit when the text is wider", () => {
		for (const max of [1, 2, 3, 4, 5, 8]) {
			expect(width(truncate("abcdefghij", max))).toBeLessThanOrEqual(max);
		}
	});

	test("text that fits is returned as it is", () => {
		expect(truncate("abc", 3)).toBe("abc");
		expect(truncate(green("abc"), 3)).toBe(green("abc"));
	});

	test("a cut inside a colored run keeps whole escapes and ends with a reset before the dots", () => {
		const out = truncate(`${green("abcdefghij")} tail`, 8);
		expect(plain(out)).toBe("abcde...");
		expect(width(out)).toBe(8);
		expect(out).toContain(`${ESC}[0m...`);
		expect(
			out.replaceAll(new RegExp(`${ESC}\\[[0-9;]*m`, "g"), ""),
		).not.toContain(ESC);
	});

	test("a cut never leaves half of a wide character: a 2-column character that does not fit is dropped whole", () => {
		const out = truncate("日本語日本語", 6);
		expect(plain(out)).toBe("日...");
		expect(width(out)).toBeLessThanOrEqual(6);
	});

	test("a joined emoji sequence is kept whole or dropped whole", () => {
		const family = "👨‍👩‍👧";
		const out = truncate(`${family}${family}${family}`, 5);
		expect(plain(out)).toBe(`${family}...`);
	});

	test("a base letter keeps its combining mark across the cut", () => {
		const out = truncate("ééééé", 4);
		expect(plain(out)).toBe("é...");
	});

	test("a cut link is closed so the rest of the terminal is not a link", () => {
		const link = `${ESC}]8;;https://a.test${BEL}${"x".repeat(20)}${ESC}]8;;${BEL}`;
		const out = truncate(link, 10);
		expect(out).toContain(`${ESC}]8;;${BEL}`);
		expect(width(out)).toBe(10);
	});

	test("a limit below the dots cuts hard with no dots, and a limit of zero gives nothing", () => {
		expect(truncate("abcdef", 3)).toBe("abc");
		expect(truncate("abcdef", 0)).toBe("");
	});

	test("the dots are ASCII, so no terminal draws them wide", () => {
		expect(truncate("abcdefghij", 6)).toBe("abc...");
	});
});

describe("clean: text from outside cannot break the line", () => {
	test("escape, bell, newline, and tab become a space and runs collapse", () => {
		expect(clean(`a${ESC}[2Kb\nc\td${BEL}e`)).toBe("a [2Kb c d e");
	});

	test("zero-width and bidi override characters are removed", () => {
		expect(clean("a​b‮c")).toBe("abc");
	});
});
