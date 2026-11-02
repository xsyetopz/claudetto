import { describe, expect, test } from "bun:test";
import { FAMILIES } from "../families.ts";
import {
	AGENTS_CAP,
	detectFamilies,
	linesOf,
	planStarter,
	previewOf,
} from "../plan.ts";

const NONE = { agents: false, claude: false };

const textOf = (
	files: readonly { path: string; text: string }[],
	path: string,
): string | undefined => files.find((file) => file.path === path)?.text;

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
		const files = ["package.json", "bun.lock", "biome.jsonc"];

		const plan = planStarter({ files, tracked: files }, NONE);

		const agents = textOf(plan, "AGENTS.md") ?? "";
		expect(agents).toContain("`bun test --bail --dots`");
		expect(agents).toContain("biome check");
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

		expect((textOf(plan, "AGENTS.md") ?? "").length).toBeLessThanOrEqual(
			AGENTS_CAP,
		);
	});

	test("each family alone fits the cap with every command on", () => {
		for (const family of FAMILIES) {
			const files = [
				...family.markers,
				...family.commands.flatMap((command) => command.when ?? []),
			].map((name) => name.replace("*", "x"));

			const plan = planStarter({ files, tracked: files }, NONE);

			const agents = textOf(plan, "AGENTS.md");
			expect(agents).toBeDefined();
			expect((agents ?? "").length).toBeLessThanOrEqual(AGENTS_CAP);
		}
	});
});

describe("table", () => {
	test("covers the eleven families", () => {
		expect(
			FAMILIES.map((family) => family.id).sort((a, b) => a.localeCompare(b)),
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
			].sort((a, b) => a.localeCompare(b)),
		);
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
