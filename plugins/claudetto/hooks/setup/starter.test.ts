import { describe, expect, test } from "claude-code/testing";

import { FAMILIES } from "./starter-families.ts";
import { detectFamilies, linesOf, planStarter, previewOf } from "./starter.ts";

const NONE = { agents: false, claude: false };

const textOf = (
	files: readonly { path: string; text: string }[],
	path: string,
): string | undefined => files.find((file) => file.path === path)?.text;

const agentsText = (files: readonly { path: string; text: string }[]): string =>
	textOf(files, "AGENTS.md") ?? "";

const filesOf = (family: (typeof FAMILIES)[number]): string[] =>
	[
		...family.markers,
		...family.commands.flatMap((command) => command.when ?? []),
	].map((name) => name.replace("*", "x"));

const namesOf = (id: string): string[] => {
	const family = FAMILIES.find((candidate) => candidate.id === id);
	if (family === undefined) {
		return [];
	}
	const bulky: readonly string[] = family.bulky ?? [];
	return [...family.heavy, ...bulky, ...family.markers];
};

describe("detectFamilies", () => {
	test("a root marker names its family", () => {
		const files = ["Cargo.toml", "src/main.rs"];

		const found = detectFamilies(files).map((family) => family.id);

		expect(found).toEqual(["rust"]);
	});

	test("a marker below the root does not count", () => {
		const files = ["docs/package.json", "docs/index.md"];

		expect(detectFamilies(files)).toEqual([]);
	});

	test("a glob marker matches a root name", () => {
		const files = ["App.csproj", "Program.cs"];

		const found = detectFamilies(files).map((family) => family.id);

		expect(found).toEqual(["dotnet"]);
	});

	test("a repo with two stacks names both, in table order", () => {
		const files = ["package.json", "go.mod"];

		const found = detectFamilies(files).map((family) => family.id);

		expect(found).toEqual(["js", "go"]);
	});
});

describe("planStarter", () => {
	test("a bun repo gets bounded commands from its markers", () => {
		const files = ["package.json", "bun.lock", "eslint.config.js"];

		const plan = planStarter({ files, tracked: files }, NONE);

		const agents = agentsText(plan);
		expect(agents).toContain("`bun test --bail --dots`");
		expect(agents).toContain("eslint --quiet");
		expect(agents).not.toContain("vitest");
	});

	test("CLAUDE.md is a title, a blank line, and the import", () => {
		const files = ["go.mod"];

		const plan = planStarter({ files, tracked: files }, NONE);

		expect(textOf(plan, "CLAUDE.md")).toBe(`# CLAUDE.md

@AGENTS.md
`);
	});

	test("an existing AGENTS.md or CLAUDE.md plans nothing", () => {
		const files = ["go.mod"];
		const listing = { files, tracked: files };

		expect(planStarter(listing, { ...NONE, agents: true })).toEqual([]);
		expect(planStarter(listing, { ...NONE, claude: true })).toEqual([]);
	});

	test("an unknown repo plans nothing", () => {
		const files = ["notes.txt"];

		expect(planStarter({ files, tracked: files }, NONE)).toEqual([]);
	});

	test("all families together stay under the cap by dropping later ones", () => {
		const files = FAMILIES.flatMap((family) => family.markers);

		const plan = planStarter({ files, tracked: files }, NONE);

		expect(agentsText(plan).length).toBeLessThanOrEqual(600);
	});

	test("each family alone fits the cap with every command on", () => {
		for (const family of FAMILIES) {
			const files = filesOf(family);

			const plan = planStarter({ files, tracked: files }, NONE);

			expect(textOf(plan, "AGENTS.md")).toBeDefined();
			expect(agentsText(plan).length).toBeLessThanOrEqual(600);
		}
	});
});

describe("table", () => {
	test("covers the eleven families", () => {
		expect(
			FAMILIES.map((family) => family.id).toSorted((a, b) =>
				a.localeCompare(b),
			),
		).toEqual(
			[
				"c",
				"dotnet",
				"go",
				"jvm",
				"js",
				"python",
				"ruby",
				"rust",
				"shell",
				"swift",
				"web",
			].toSorted((a, b) => a.localeCompare(b)),
		);
	});
});

describe("unsourced table entries", () => {
	// No doc, `--help`, or probe of 2026-11-03 names these, so a generated file must not hold them.
	const unsourced: readonly {
		id: string;
		heavy: readonly string[];
		bulky: readonly string[];
		markers: readonly string[];
	}[] = [
		{ id: "c", heavy: ["build/", "cmake-build-*/"], bulky: [], markers: [] },
		{ id: "dotnet", heavy: ["packages/"], bulky: [], markers: [] },
		{ id: "js", heavy: [], bulky: ["*.min.js", "*.map"], markers: [] },
		{ id: "ruby", heavy: ["tmp/", "log/"], bulky: [], markers: [] },
		{
			id: "swift",
			heavy: [],
			bulky: ["Package.resolved"],
			markers: ["*.xcodeproj", "*.xcworkspace"],
		},
		{
			id: "web",
			heavy: [],
			bulky: ["*.min.css", "*.min.js", "*.map"],
			markers: ["index.html"],
		},
	];

	test("no family lists an entry that no source names", () => {
		for (const entry of unsourced) {
			const held = namesOf(entry.id);
			const banned = new Set([
				...entry.heavy,
				...entry.bulky,
				...entry.markers,
			]);

			expect(held.filter((name) => banned.has(name))).toEqual([]);
		}
	});
});

describe("linesOf and previewOf", () => {
	test("linesOf drops blank lines", () => {
		expect(
			linesOf(`a

b
`),
		).toEqual(["a", "b"]);
	});

	test("previewOf marks each new line with a plus", () => {
		const shown = previewOf([
			{
				path: "X",
				text: `a
b
`,
			},
		]);

		expect(shown).toBe(`+++ X
+a
+b`);
	});
});
