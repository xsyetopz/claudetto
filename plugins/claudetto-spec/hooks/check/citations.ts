import { citedIds } from "./paths";
import { countAssertions } from "./tamper";

/** A test block that cites a requirement ID and calls no assertion beyond a tautology. */
export interface CitedUnasserted {
	id: string;
	file: string;
	line: number;
}

// A block opens at a test declaration of the JS, Python or Go style and runs to the next
// test or suite line, so a test body that spans nested helpers is cut at the next `test(`.
const TEST_START =
	/^\s*(?:(?:test|it)(?:\.[A-Za-z]+)*\s*\(|(?:async\s+)?def\s+test_|func\s+Test)/u;
const SUITE_START = /^\s*(?:describe|suite|context)(?:\.[A-Za-z]+)*\s*\(/u;

// An assertion that compares a literal with itself passes whatever the code does, so it
// asserts nothing a requirement states; each match holds one call `countAssertions` counts.
const LITERAL = String.raw`(?:true|false|null|undefined|-?\d+(?:\.\d+)?|"[^"\n]*"|'[^'\n]*')`;
const TAUTOLOGIES = [
	new RegExp(
		String.raw`\bexpect\(\s*(${LITERAL})\s*\)\s*\.\s*(?:toBe|toEqual|toStrictEqual)\(\s*\1\s*\)`,
		"gu"
	),
	/\bexpect\(\s*(?:true|1)\s*\)\s*\.\s*toBeTruthy\(\s*\)/gu,
	/\bexpect\(\s*(?:false|0|null)\s*\)\s*\.\s*toBeFalsy\(\s*\)/gu,
	/\bassert\s+True[ \t]*(?:#.*)?$/gmu,
	/\bassertTrue\(\s*True\s*\)/gu
];

function realAssertions(text: string): number {
	const hollow = TAUTOLOGIES.reduce(
		(sum, pattern) => sum + (text.match(pattern)?.length ?? 0),
		0
	);
	return countAssertions(text) - hollow;
}

/**
 * Lists the known IDs each test block cites without an assertion call in the block, where a
 * call that compares a literal with itself, such as `expect(true).toBe(true)`, counts as none.
 *
 * This is a heuristic. A block runs from its declaration line to the next test or suite
 * line, and an assertion is any call `countAssertions` knows. It misreports a test whose
 * assertions live in a helper or a framework with other assertion names (such as Go's
 * `t.Errorf`) as citation-only, and a block ended early by a nested test line as unasserted.
 *
 * @param file The test file's path.
 * @param text The test file's text.
 * @param known IDs some spec defines; other cited tokens such as `UTF-8` are ignored.
 */
export function citedUnasserted(
	file: string,
	text: string,
	known: ReadonlySet<string>
): CitedUnasserted[] {
	const found: CitedUnasserted[] = [];
	let start = -1;
	let body: string[] = [];
	const close = (): void => {
		const joined = body.join("\n");
		if (start >= 0 && realAssertions(joined) === 0) {
			for (const id of citedIds(joined).filter((i) => known.has(i))) {
				found.push({ id, file, line: start + 1 });
			}
		}
		start = -1;
		body = [];
	};
	for (const [index, line] of text.split(/\r?\n/u).entries()) {
		if (TEST_START.test(line)) {
			close();
			start = index;
		} else if (SUITE_START.test(line)) {
			close();
		}
		if (start >= 0) {
			body.push(line);
		}
	}
	close();
	return found;
}
