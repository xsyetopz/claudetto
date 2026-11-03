import { readFile } from "node:fs/promises";
import { parseRange } from "./parse.ts";

const ROW = /^\| `(\d+-\d+)` \| ([\d ]+) \|$/;

const text = await readFile("docs/ranges.md", "utf8");
const wrong = text
	.split("\n")
	.flatMap((line) => {
		const match = ROW.exec(line);
		const [, range = "", shown = ""] = match ?? [];
		return match !== null && parseRange(range).join(" ") !== shown.trim()
			? [`${range}: the doc shows ${shown.trim()}`]
			: [];
	});

if (wrong.length > 0) {
	console.error(wrong.join("\n"));
	process.exitCode = 1;
}
