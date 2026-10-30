import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SOURCE_NOTE } from "../../../tools/rebuild/constants.ts";
import {
	brandFaults,
	codeLinesOf,
	copyFaults,
	DESIGN_NOTE,
	lengthFaults,
	lengthReport,
	originalPromptChars,
	promptChars,
} from "../../../tools/rebuild/own.ts";
import {
	lex,
	shippedManifests,
	shippedSources,
} from "../../../tools/source-text.ts";

const ROOT = join(import.meta.dir, "..", "..", "..");

const FILE = { path: "src/x.ts" } as const;

describe("a code line of the note", () => {
	test("is a backtick span that holds a space and a code mark", () => {
		const note = "It runs `let j = await s.model.fork({ prompt: p })` once.";

		expect(codeLinesOf(note)).toStrictEqual([
			"letj=awaits.model.fork({prompt:p})",
		]);
	});

	test("is not a bare call such as a name of the interface", () => {
		const note = "It reads `session.surfaces()` and `store.get`.";

		expect(codeLinesOf(note)).toStrictEqual([]);
	});

	test("is a regular expression literal of plain text", () => {
		const note = "  HEADS_UP = /^\\W*heads[\\s-]*up\\W*$/i  (line 1396)";

		expect(codeLinesOf(note)).toStrictEqual(["/^\\W*heads[\\s-]*up\\W*$/i"]);
	});

	test("is not read from the account of the rebuild's own that follows the marker", () => {
		const note = `The original \`let a = b(c) + d(e);\` here.
WHAT THE REBUILD USES
Ours \`let z = y(x) + w(v);\` there.`;

		expect(codeLinesOf(note)).toStrictEqual(["leta=b(c)+d(e);"]);
	});
});

describe("a shipped line", () => {
	const codeLines = [
		"letj=awaits.model.fork({prompt:p})",
		"/^learn\\s*:\\s*/i",
	];

	test("is a fault when it holds a code line of the note, whatever its spacing", () => {
		const text = `const r = 1;
	let j  =  await s.model.fork({ prompt: p });
`;

		const faults = copyFaults({ ...FILE, text }, codeLines);

		expect(faults).toHaveLength(1);
		expect(faults[0]).toStartWith("src/x.ts:2: holds the code line");
	});

	test("is a fault when it declares a regular expression the note quotes", () => {
		const text = "const LEARN_LABEL = /^learn\\s*:\\s*/i;";

		expect(copyFaults({ ...FILE, text }, codeLines)).toHaveLength(1);
	});

	test("is no fault when the same text sits in a comment", () => {
		const text = `// let j = await s.model.fork({ prompt: p })
const a = 1;`;

		expect(copyFaults({ ...FILE, text }, codeLines)).toStrictEqual([]);
	});

	test("is no fault when its code differs", () => {
		const text = "const r = await $.model.complete(request);";

		expect(copyFaults({ ...FILE, text }, codeLines)).toStrictEqual([]);
	});
});

describe("the observer prompt", () => {
	test("is read at the size the note gives the original's", () => {
		expect(originalPromptChars("`proposePrompt` is `33,015` characters")).toBe(
			33_015,
		);
	});

	test("is a fault when the note gives no size to hold it under", () => {
		expect(lengthFaults(100, undefined)).toHaveLength(1);
	});

	test("is a fault when it is as long as the original's", () => {
		expect(lengthFaults(33_015, 33_015)).toStrictEqual([
			"the observer prompt holds 33015 characters, and it must be shorter than the original's 33015",
		]);
	});

	test("is no fault when it is shorter, and the report names the count", () => {
		expect(lengthFaults(1593, 33_015)).toStrictEqual([]);
		expect(lengthReport(1593, 33_015)).toBe(
			"observer prompt: 1593 characters, against 33015 in the original",
		);
	});
});

describe("a shipped string", () => {
	test("is a fault when it holds Claude or Anthropic", () => {
		const strings = lex('const a = `Claude`; const b = "Made by Anthropic";');

		expect(brandFaults("src/x.ts", strings.strings)).toStrictEqual([
			'src/x.ts:1: a shipped string holds "Claude", and the rebuild carries no trade name',
			'src/x.ts:1: a shipped string holds "Anthropic", and the rebuild carries no trade name',
		]);
	});

	test("is no fault when it holds a lowercase model id", () => {
		const strings = lex('const m = "claude-haiku-5-5";');

		expect(brandFaults("src/x.ts", strings.strings)).toStrictEqual([]);
	});
});

describe("the shipped plugin", () => {
	test("copies no code line of either note", async () => {
		const notes = await Promise.all(
			[SOURCE_NOTE, DESIGN_NOTE].map((p) => readFile(join(ROOT, p), "utf8")),
		);
		const codeLines = notes.flatMap((note) => codeLinesOf(note));

		const faults = (await shippedSources(ROOT)).flatMap((file) =>
			copyFaults(file, codeLines),
		);

		expect(codeLines.length).toBeGreaterThan(0);
		expect(faults).toStrictEqual([]);
	});

	test("has an observer prompt shorter than the original's", async () => {
		const note = await readFile(join(ROOT, SOURCE_NOTE), "utf8");

		expect(
			lengthFaults(promptChars(), originalPromptChars(note)),
		).toStrictEqual([]);
	});

	test("holds no trade name in a string of its code or its manifests", async () => {
		const code = (await shippedSources(ROOT)).flatMap((file) =>
			brandFaults(file.path, lex(file.text).strings),
		);
		const manifests = (await shippedManifests(ROOT)).flatMap((file) =>
			brandFaults(
				file.path,
				file.text.split("\n").map((text) => ({ line: 1, text })),
			),
		);

		expect([...code, ...manifests]).toStrictEqual([]);
	});
});
