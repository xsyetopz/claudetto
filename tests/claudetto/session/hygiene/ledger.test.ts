// The pure parts of the edit ledger (spec `session-hygiene`, "Edit Ledger").

import { expect, test } from "bun:test";
import {
	GONE,
	hash64,
	type LedgerLine,
	ledgerPath,
	madeBy,
	parseLedger,
	projectKey,
	statusPaths,
} from "../../../../plugins/claudetto/modules/project/domain/ledger.ts";
import {
	changedFiles,
	ledgerText,
	withEdit,
	withTold,
} from "../../../../plugins/claudetto/modules/session/hygiene/domain/ledger.ts";
import { LEDGER_MAX_FILES } from "../../../../plugins/claudetto/modules/session/hygiene/limits.ts";

const PATTERN_1 = /^app-[0-9a-f]{16}$/;

/** FNV-1a with 64 bits on BigInt, over the same code units. */
const reference = (text: string): string => {
	let h = 0xcbf29ce484222325n;
	for (let i = 0; i < text.length; i++) {
		h ^= BigInt(text.charCodeAt(i));
		h = BigInt.asUintN(64, h * 0x100000001b3n);
	}
	return h.toString(16).padStart(16, "0");
};

const line = (
	path: string,
	hash: string,
	session = "s1",
	agent = "main",
): LedgerLine => ({ path, hash, session, agent });

test("`hash64` gives the published FNV-1a vectors", () => {
	expect(hash64("")).toBe("cbf29ce484222325");
	expect(hash64("a")).toBe("af63dc4c8601ec8c");
	expect(hash64("foobar")).toBe("85944171f73967e8");
});

test("`hash64` equals the BigInt hash for text of many shapes", () => {
	const samples = [
		"const a = 1;\n",
		"é€😀\u0000￿",
		"x".repeat(10_000),
		Array.from({ length: 2000 }, (_, i) => String.fromCharCode(i * 31)).join(
			"",
		),
	];
	for (const s of samples) {
		expect(hash64(s)).toBe(reference(s));
	}
});

test("`hash64` differs for text that differs by one unit", () => {
	expect(hash64("const a = 1;")).not.toBe(hash64("const a = 1"));
});

test("the ledger file is in the temp folder, with a key for each project", () => {
	expect(ledgerPath("/tmp", "/work/app")).toBe(
		`/tmp/claudetto/ledger/${projectKey("/work/app")}.jsonl`,
	);
	expect(projectKey("/work/app")).toMatch(PATTERN_1);
	expect(projectKey("/work/app")).not.toBe(projectKey("/other/app"));
});

test("`parseLedger` reads the lines that `ledgerText` writes, and skips a bad line", () => {
	const lines = [line("/a", "1"), line("/b", "2", "s2", "w")];
	expect(parseLedger(ledgerText(lines))).toStrictEqual(lines);
	expect(
		parseLedger(`not json\n{"path":1}\n${ledgerText(lines)}`),
	).toStrictEqual(lines);
});

test("`madeBy` finds the lines of a path with one hash, and none for a change of the user", () => {
	const lines = [line("/a", "1"), line("/a", "2", "s2"), line("/b", "1")];
	expect(madeBy(lines, "/a", "2")).toStrictEqual([line("/a", "2", "s2")]);
	expect(madeBy(lines, "/a", "9")).toStrictEqual([]);
	expect(madeBy(lines, "/c", "1")).toStrictEqual([]);
});

test("`withEdit` moves the file to the end and keeps `LEDGER_MAX_FILES` lines", () => {
	let lines: LedgerLine[] = [];
	for (let i = 0; i < LEDGER_MAX_FILES + 5; i++) {
		lines = withEdit(lines, line(`/f${i}`, "h"));
	}
	expect(lines.length).toBe(LEDGER_MAX_FILES);
	expect(lines[0]?.path).toBe("/f5");
	lines = withEdit(lines, line("/f5", "h2"));
	expect(lines.at(-1)).toStrictEqual(line("/f5", "h2"));
	expect(lines.filter((l) => l.path === "/f5").length).toBe(1);
});

test("`withEdit` keeps the lines of two sessions for one file", () => {
	const lines = withEdit([line("/a", "1", "s1")], line("/a", "2", "s2"));
	expect(lines.map((l) => l.session)).toStrictEqual(["s1", "s2"]);
});

test("Two Sessions: session B finds the entry of session A for `b.ts`", () => {
	const written = ledgerText(withEdit([], line("/p/b.ts", "1", "A", "main")));
	const found = parseLedger(written).find((l) => l.path === "/p/b.ts");
	expect(found).toStrictEqual(line("/p/b.ts", "1", "A", "main"));
});

test("`changedFiles` skips a file that matches, a hash that the session knows, and a file of another session", () => {
	const lines = [
		line("/a", "1"),
		line("/b", "1"),
		line("/c", "1", "s1", "w"),
		line("/d", "1"),
		line("/e", "1", "s2"),
		line("/f", "1"),
		line("/f", "2", "s2"),
	];
	const now = { "/a": "1", "/b": "2", "/c": GONE, "/e": "9", "/f": "2" };
	const told = { "/b": "2" };
	expect(changedFiles(lines, "s1", told, now)).toStrictEqual([
		{ path: "/c", agent: "w" },
	]);
});

test("`withTold` keeps the new hash, so the same change gives one line", () => {
	const lines = [line("/a", "1")];
	const now = { "/a": "2" };
	const told = withTold({}, changedFiles(lines, "s1", {}, now), now);
	expect(told).toStrictEqual({ "/a": "2" });
	expect(changedFiles(lines, "s1", told, now)).toStrictEqual([]);
});

test("`statusPaths` reads the files of `git status --porcelain -z`", () => {
	const out = [
		" M src/a.ts",
		"?? new/b.ts",
		" D gone.ts",
		"R  new-name.ts",
		"old-name.ts",
		"?? dir/",
		"",
	].join("\0");
	expect(statusPaths(out)).toStrictEqual([
		"src/a.ts",
		"new/b.ts",
		"new-name.ts",
	]);
});
