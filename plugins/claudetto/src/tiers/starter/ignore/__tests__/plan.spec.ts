import { describe, expect, test } from "bun:test";
import { FAMILIES, type Family } from "../../families.ts";
import { GITIGNORE_FIXED, ignoreLines } from "../plan.ts";

const star = (name: string): string => name.replace(/\*/g, "x");

/** A file or folder path that the pattern names, as git would list it. */
const sampleOf = (pattern: string): string =>
	pattern.endsWith("/") ? `${star(pattern)}f` : star(pattern);

const markersOf = (family: Family): string[] => family.markers.map(star);

const heavyOf = (family: Family): readonly string[] => family.heavy;
const bulkyOf = (family: Family): readonly string[] => family.bulky ?? [];

describe("the fixed template", () => {
	test("a folder of no known family gets the fixed lines and an empty `.ignore`", () => {
		const files = ["notes.txt"];

		const lines = ignoreLines({ files, tracked: files });

		expect(lines.gitignore).toEqual([...GITIGNORE_FIXED]);
		expect(lines.ignore).toEqual([]);
	});
});

describe("each family", () => {
	for (const family of FAMILIES) {
		test(`${family.id}: tracked heavy and bulky paths go to \`.ignore\` only`, () => {
			const files = [
				...markersOf(family),
				...[...heavyOf(family), ...bulkyOf(family)].map(sampleOf),
			];

			const lines = ignoreLines({ files, tracked: files });

			for (const pattern of [...heavyOf(family), ...bulkyOf(family)]) {
				expect(lines.ignore).toContain(pattern);
				expect(lines.gitignore).not.toContain(pattern);
			}
		});

		test(`${family.id}: heavy paths git does not track go to \`.gitignore\`, and absent bulky ones nowhere`, () => {
			const files = markersOf(family);
			const tracked = files.filter((name) => !bulkyOf(family).includes(name));

			const lines = ignoreLines({ files, tracked });

			for (const pattern of heavyOf(family)) {
				expect(lines.gitignore).toContain(pattern);
				expect(lines.ignore).not.toContain(pattern);
			}
			const absent = bulkyOf(family).filter(
				(pattern) => !files.includes(star(pattern)),
			);
			for (const pattern of absent) {
				expect(lines.gitignore).not.toContain(pattern);
				expect(lines.ignore).not.toContain(pattern);
			}
		});
	}
});

describe("a repo with two stacks", () => {
	test("the paths of both land in the files, with a shared path once", () => {
		const files = ["Cargo.toml", "Cargo.lock", "pom.xml"];

		const lines = ignoreLines({ files, tracked: files });

		expect(lines.ignore).toEqual(["Cargo.lock"]);
		expect(lines.gitignore.filter((line) => line === "target/")).toEqual([
			"target/",
		]);
		expect(lines.gitignore).toContain(".gradle/");
	});

	test("a lock file git sees but does not track still goes to `.ignore`", () => {
		const lines = ignoreLines({
			files: ["Cargo.toml", "Cargo.lock"],
			tracked: ["Cargo.toml"],
		});

		expect(lines.ignore).toEqual(["Cargo.lock"]);
	});
});
