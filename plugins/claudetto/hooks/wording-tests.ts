import type { EngineInterface } from "claude-code";

import type { CheckAnswer, CheckEvent, CheckNext } from "./chain.ts";
import { deny, fieldOf } from "./gate/verdict.ts";
import { WORDING_TEST } from "./texts.ts";

const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/u;
const ASSERTED =
	/\.(?:toContain|toMatch|toBe|toEqual|toStrictEqual|toInclude|toStartWith|toEndWith)\(\s*(["'`])((?:\\.|(?!\1).)*)\1/gu;
// Four words or more: a shorter literal is an identifier, a path, or a value, which a test may well share with the code.
const PHRASE = /^\S+(?:\s+\S+){3,}$/u;

/** The prose phrases a test edit asserts on; the part before a backslash or `${`, since the shipped file may quote or escape it otherwise. */
const assertedPhrases = (code: string): string[] =>
	[...code.matchAll(ASSERTED)]
		.map((m) => (m[2] ?? "").split(/\\|\$\{/u)[0]?.trim() ?? "")
		.filter((phrase) => PHRASE.test(phrase));

async function shippedIn(
	$: EngineInterface,
	phrase: string,
): Promise<string | undefined> {
	const r = await $.process
		.run(
			[
				"git",
				"grep",
				"-l",
				"-F",
				"-e",
				phrase,
				"--",
				".",
				":!*.test.*",
				":!*.spec.*",
			],
			{ cwd: await $.session.cwd() },
		)
		.catch(() => void 0);
	return r?.exitCode === 0 ? r.stdout.split("\n")[0] : undefined;
}

/** Denies a test edit whose assertion copies a phrase a non-test file ships: such a test breaks on each rewording and catches no defect. */
export async function wordingTestsCheck(
	$: EngineInterface,
	e: CheckEvent,
	next: CheckNext,
): Promise<Awaited<CheckAnswer>> {
	if (!/^(?:Edit|Write)$/u.test(e.tool)) {
		return next(e);
	}
	const path = fieldOf(e.input, "file_path") ?? "";
	const code =
		fieldOf(e.input, "new_string") ?? fieldOf(e.input, "content") ?? "";
	const phrases = TEST_FILE.test(path) ? assertedPhrases(code) : [];
	const files = await Promise.all(phrases.map((p) => shippedIn($, p)));
	const hit = files.findIndex((file) => file !== undefined);
	return hit === -1
		? next(e)
		: deny(WORDING_TEST(phrases[hit] ?? "", files[hit] ?? ""));
}
