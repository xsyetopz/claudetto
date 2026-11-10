import { expect, test } from "bun:test";
import { realpathSync } from "node:fs";

import { PALETTES } from "../../plugins/claudetto/statusline/color.ts";

/** The theme switch of the engine (`RK` in `chunk-w5ysqthb.js`, 2.1.319), matched without its minified names. */
const THEME_SWITCH =
	/function \w+\(\w+\)\{switch\(\w+\)\{case"light":return (\w+);case"light-ansi":return (\w+);case"dark-ansi":return (\w+);case"light-daltonized":return (\w+);case"dark-daltonized":return (\w+);default:return (\w+)\}\}/;
const THEMES = [
	"light",
	"light-ansi",
	"dark-ansi",
	"light-daltonized",
	"dark-daltonized",
	"dark",
];
const ROLES = [
	"success",
	"warning",
	"error",
	"inactive",
	"claude",
	"merged",
] as const;
/** The foreground table of the bundled `ansi-styles`, which chalk paints an `ansi:` name with. */
const ANSI_TABLE = "color:{black:[30,39]";

const engineText = async (): Promise<string> => {
	const claude = Bun.which("claude");
	if (claude === null) {
		throw new Error(
			"`claude` is not on PATH: install Claude Code (https://code.claude.com/docs/en/setup) to check the palettes",
		);
	}
	return Buffer.from(
		await Bun.file(realpathSync(claude)).arrayBuffer(),
	).toString("latin1");
};

test("the copied palettes equal the engine's built-in theme tables", async () => {
	const text = await engineText();
	const found = THEME_SWITCH.exec(text);
	expect(found).not.toBeNull();
	const at = text.indexOf(ANSI_TABLE);
	const ansi = new Map(
		[
			...text.slice(at, text.indexOf("}", at)).matchAll(/(\w+):\[(\d+),39\]/g),
		].map((m) => [m[1], Number(m[2])]),
	);
	const colorOf = (value: string) => {
		const rgb = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(value);
		return rgb
			? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
			: ansi.get(value.replace(/^ansi:/, ""));
	};
	const engine = Object.fromEntries(
		THEMES.map((theme, i) => {
			const table = `${found?.[i + 1]}={autoAccept:`;
			const start = text.lastIndexOf(table, found?.index);
			const body = text.slice(start, text.indexOf("}", start));
			return [
				theme,
				Object.fromEntries(
					ROLES.map((role) => [
						role,
						colorOf(new RegExp(`[{,]${role}:"([^"]+)"`).exec(body)?.[1] ?? ""),
					]),
				),
			];
		}),
	);
	expect(PALETTES).toEqual(engine);
});
