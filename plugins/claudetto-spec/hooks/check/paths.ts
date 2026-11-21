export const ID_PATTERN = String.raw`[A-Z][A-Z0-9]*-\d+`;
const CITATION = new RegExp(
	String.raw`(?<![A-Za-z0-9-])${ID_PATTERN}(?![A-Za-z0-9])`,
	"gu"
);
const SPEC_FILE = /^specs\/[^/]+\.md$/u;
const TEST_FILE =
	/(?:^|\/)(?:__tests__|tests?)\/|(?:^|\/)[^/]*\.(?:test|spec)\.[^/]+$|(?:^|\/)[^/]*_test\.[^/]+$|(?:^|\/)test_[^/]*\.py$/u;

/** The paths a listing names, one per line, without repeats. */
export function listPaths(output: string): string[] {
	const paths = output
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line !== "");
	return [...new Set(paths)];
}

/** True for a path that is a spec file: `specs/<capability>.md`. */
export function isSpecFile(path: string): boolean {
	return SPEC_FILE.test(path);
}

/** True for a path that is a test file by the conventions the check knows. */
export function isTestFile(path: string): boolean {
	return TEST_FILE.test(path);
}

/** The paths of one listing that `checkSpecs` needs the text of. */
export function wantedPaths(listing: string): string[] {
	return listPaths(listing).filter((p) => isSpecFile(p) || isTestFile(p));
}

/** Every requirement ID a test text cites. */
export function citedIds(text: string): string[] {
	return [...new Set(text.match(CITATION))];
}
