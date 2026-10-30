// The rebuilt observer is the project's own code: a copied code line of the source note fails.
// Usage: bun tools/rebuild/own.ts

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	bodyOf,
	INSTRUCTIONS,
} from "../../plugins/claudetto-you-should-know/src/prompt.ts";
import {
	lex,
	type Shipped,
	shippedManifests,
	shippedSources,
} from "../source-text.ts";
import { SOURCE_NOTE } from "./constants.ts";

export const DESIGN_NOTE = "docs/keep/plugins/you-should-know-design.txt";

export const TRADE_NAMES: readonly string[] = ["Claude", "Anthropic"];

/** The shortest quoted code line that counts as one, in characters with the spaces left out. */
const MIN_CODE_CHARS = 12;

/** A regex literal is dense, so a shorter one counts. */
const MIN_REGEX_CHARS = 6;

const BACKTICK_SPAN = /`([^`\n]+)`/g;

const CODE_MARK = /[=;(){}]/;

const REGEX_LITERAL = /\/\^\S+\/[dgimsuy]*/g;

const SPACES = /\s+/g;

const HAS_SPACE = /\s/;

const ORIGINAL_SIZE = /`proposePrompt` is `([\d,]+)` characters/;

/** Text with all white space dropped, so a line copied and re-indented still matches. */
const squashed = (text: string): string => text.replace(SPACES, "");

const REBUILD_PART = "\nWHAT THE REBUILD USES";

/** Only the part about the original counts: the rebuild's own account quotes the rebuild's names. */
export const codeLinesOf = (note: string): readonly string[] => {
	const original = note.split(REBUILD_PART)[0] ?? "";
	const spans = [...original.matchAll(BACKTICK_SPAN)]
		.map((found) => (found[1] ?? "").trim())
		.filter((span) => HAS_SPACE.test(span) && CODE_MARK.test(span))
		.map(squashed)
		.filter((span) => span.length >= MIN_CODE_CHARS);
	const regexes = (original.match(REGEX_LITERAL) ?? [])
		.map(squashed)
		.filter((regex) => regex.length >= MIN_REGEX_CHARS);
	return [...new Set([...spans, ...regexes])];
};

export const copyFaults = (
	file: Shipped,
	codeLines: readonly string[],
): readonly string[] =>
	lex(file.text)
		.code.split("\n")
		.flatMap((line, at) => {
			const mine = squashed(line);
			const copied = codeLines.find(
				(code) =>
					mine.includes(code) ||
					(mine.length >= MIN_CODE_CHARS && code.includes(mine)),
			);
			return copied === undefined
				? []
				: [
						`${file.path}:${at + 1}: holds the code line \`${copied}\` of the source note, and the rebuild ships its own code`,
					];
		});

export const originalPromptChars = (note: string): number | undefined => {
	const found = ORIGINAL_SIZE.exec(note);
	const digits = (found?.[1] ?? "").replaceAll(",", "");
	return digits === "" ? undefined : Number(digits);
};

export const promptChars = (): number =>
	INSTRUCTIONS.length + bodyOf([], [], "").length;

export const lengthFaults = (
	chars: number,
	original: number | undefined,
): readonly string[] => {
	if (original === undefined) {
		return [
			`${SOURCE_NOTE} does not give the size of the original prompt, so the rebuild cannot be held under it`,
		];
	}
	return chars < original
		? []
		: [
				`the observer prompt holds ${chars} characters, and it must be shorter than the original's ${original}`,
			];
};

export const lengthReport = (
	chars: number,
	original: number | undefined,
): string =>
	`observer prompt: ${chars} characters, against ${original ?? "an unread number of"} in the original`;

export const brandFaults = (
	path: string,
	strings: readonly { line: number; text: string }[],
): readonly string[] =>
	strings.flatMap(({ line, text }) =>
		TRADE_NAMES.filter((name) => text.includes(name)).map(
			(name) =>
				`${path}:${line}: a shipped string holds "${name}", and the rebuild carries no trade name`,
		),
	);

const main = async (): Promise<void> => {
	const root = join(import.meta.dir, "../..");
	const notes = await Promise.all(
		[SOURCE_NOTE, DESIGN_NOTE].map((path) =>
			readFile(join(root, path), "utf8"),
		),
	);
	const codeLines = notes.flatMap((note) => codeLinesOf(note));
	const files = await shippedSources(root);
	const manifests = await shippedManifests(root);
	const chars = promptChars();
	const original = originalPromptChars(notes[0] ?? "");
	console.info(lengthReport(chars, original));
	const faults = [
		...files.flatMap((file) => copyFaults(file, codeLines)),
		...lengthFaults(chars, original),
		...files.flatMap((file) => brandFaults(file.path, lex(file.text).strings)),
		...manifests.flatMap((file) =>
			brandFaults(
				file.path,
				file.text.split("\n").map((text) => ({ line: 1, text })),
			),
		),
	];
	for (const line of faults) {
		console.error(line);
	}
	if (faults.length > 0) {
		process.exitCode = 1;
	}
};

if (import.meta.main) {
	await main();
}
