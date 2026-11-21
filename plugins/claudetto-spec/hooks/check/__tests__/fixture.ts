import { type CheckInput, checkSpecs, type Report } from "../spec";

/** A mutable `CheckInput` the fault planters edit. */
export interface Fixture {
	listing: string;
	diff: string;
	deleted: string;
	texts: Map<string, string>;
	head: Map<string, string>;
	index: Map<string, string>;
}

export const SPEC = "specs/auth.md";
export const TEST = "tests/auth.test.ts";

const SPEC_TEXT = `# Auth

## AUTH-1 Login

A valid user receives a session.

Given a registered user
When the user posts the right password
Then a session cookie is set

## AUTH-2 Lockout

Five failures lock the account.
`;

const TEST_TEXT = `test("AUTH-1 logs in", () => {
	expect(login("ok")).toBe(true);
});

test("AUTH-2 locks out", () => {
	expect(lock(5)).toBe(true);
	expect(lock(4)).toBe(false);
});
`;

/** A spec and a test that reports nothing: HEAD, index and work tree agree and the test is staged. */
export function cleanFixture(): Fixture {
	return {
		listing: `${SPEC}\n${TEST}\n`,
		diff: "",
		deleted: "",
		texts: new Map([
			[SPEC, SPEC_TEXT],
			[TEST, TEST_TEXT]
		]),
		head: new Map([[SPEC, SPEC_TEXT]]),
		index: new Map([[TEST, TEST_TEXT]])
	};
}

/** Runs the check over a fixture. */
export function report(f: Fixture): Report {
	const input: CheckInput = { ...f };
	return checkSpecs(input);
}

function edited(f: Fixture, text: string): void {
	f.diff = `${TEST}\n`;
	f.texts.set(TEST, text);
}

/** A test file deleted from the work tree after staging. */
export function plantDeletedTest(f: Fixture): void {
	f.diff = `${TEST}\n`;
	f.deleted = `${TEST}\n`;
	f.texts.delete(TEST);
}

/** A skip marker added to a staged test. */
export function plantSkip(f: Fixture): void {
	edited(f, `${TEST_TEXT}\ntest.skip("later", () => {});\n`);
}

/** An assertion removed from a staged test. */
export function plantRemovedAssertion(f: Fixture): void {
	edited(f, TEST_TEXT.replace("\texpect(lock(4)).toBe(false);\n", ""));
}

/** A test that cites AUTH-1 and asserts nothing. */
export function plantCitationOnly(f: Fixture): void {
	f.texts.set(
		TEST,
		`${TEST_TEXT}\ntest("AUTH-1 again", () => {\n\tlogin("ok");\n});\n`
	);
}

/** A test citing an ID the spec never defined. */
export function plantOrphan(f: Fixture): void {
	f.texts.set(TEST, TEST_TEXT.replace("AUTH-2 locks", "AUTH-2 AUTH-9 locks"));
}

/** A requirement with two behaviour sentences (HEAD agrees, so it is not drift). */
export function plantInflated(f: Fixture): void {
	const text = (f.texts.get(SPEC) ?? "").replace(
		"Five failures lock the account.",
		"Five failures lock the account. The lock lasts an hour."
	);
	f.texts.set(SPEC, text);
	f.head.set(SPEC, text);
}

/** A requirement HEAD had and the work tree dropped. */
export function plantRemovedId(f: Fixture): void {
	f.head.set(
		SPEC,
		`${f.head.get(SPEC) ?? ""}\n## AUTH-3 Logout\n\nA user can log out.\n`
	);
}

/** A requirement whose sentence differs from HEAD's. */
export function plantReworded(f: Fixture): void {
	f.head.set(
		SPEC,
		(f.head.get(SPEC) ?? "").replace("Five failures", "Three failures")
	);
}
