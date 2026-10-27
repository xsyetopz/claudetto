// The pure parts of the edit ledger (spec `session-hygiene`, "Edit Ledger").

import { expect, test } from "bun:test";
import {
	hash64,
	type LedgerLine,
	ledgerKey,
	madeBy,
	parseLedger,
	projectKey,
	statusPaths,
} from "../../../../plugins/claudetto/modules/project/domain/ledger.ts";
import { withEdit } from "../../../../plugins/claudetto/modules/session/hygiene/domain/ledger.ts";
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
	via: LedgerLine["via"] = "edit",
): LedgerLine => ({ path, hash, session, agent, via });

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

test("the ledger key is in the store, with a key for each project, and fits the key limit", () => {
	expect(ledgerKey("/work/app")).toBe(`ledger:${projectKey("/work/app")}`);
	expect(projectKey("/work/app")).toMatch(PATTERN_1);
	expect(projectKey("/work/app")).not.toBe(projectKey("/other/app"));
	expect(ledgerKey(`/w/${"x".repeat(400)}`).length).toBeLessThanOrEqual(256);
});

test("`parseLedger` reads the stored lines, and drops a bad line and a line with no valid `via`", () => {
	const lines = [line("/a", "1"), line("/b", "2", "s2", "w", "bash")];
	expect(parseLedger(lines)).toStrictEqual(lines);
	const noVia = { path: "/c", hash: "3", session: "s1", agent: "main" };
	expect(
		parseLedger([
			"not a line",
			{ path: 1 },
			noVia,
			{ ...noVia, via: "other" },
			...lines,
		]),
	).toStrictEqual(lines);
	expect(parseLedger(undefined)).toStrictEqual([]);
	expect(parseLedger("text")).toStrictEqual([]);
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

test("`withEdit` keeps an `edit` line and a `bash` line of one file and session", () => {
	const lines = withEdit(
		[line("/a", "1", "s1", "main", "edit")],
		line("/a", "2", "s1", "main", "bash"),
	);
	expect(lines.map((l) => l.via)).toStrictEqual(["edit", "bash"]);
});

test("`withEdit` keeps the lines of two sessions for one file", () => {
	const lines = withEdit([line("/a", "1", "s1")], line("/a", "2", "s2"));
	expect(lines.map((l) => l.session)).toStrictEqual(["s1", "s2"]);
});

test("Two Sessions: session B finds the entry of session A for `b.ts`", () => {
	const stored = structuredClone(
		withEdit([], line("/p/b.ts", "1", "A", "main")),
	);
	const found = parseLedger(stored).find((l) => l.path === "/p/b.ts");
	expect(found).toStrictEqual(line("/p/b.ts", "1", "A", "main"));
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
