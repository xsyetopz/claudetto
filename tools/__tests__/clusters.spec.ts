import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	concernOf,
	type Folder,
	folderFaults,
	readFolders,
	stemOf,
} from "../clusters.ts";

/** The names are file names, not stems, since the walk reads those and a fault must name a file on disk. */
const folder = (
	files: string[],
	dir = "tools",
	folders: string[] = [],
): Folder => ({
	dir,
	concern: concernOf(dir),
	members: files.map((file) => ({ stem: stemOf(file), file })),
	folders,
});

const treeOf = async (paths: string[]): Promise<string> => {
	const root = await mkdtemp(join(tmpdir(), "claudetto-clusters-"));
	await Promise.all(
		[...new Set(paths.map((path) => join(root, path, "..")))].map((dir) =>
			mkdir(dir, { recursive: true }),
		),
	);
	await Promise.all(
		paths.map((path) => writeFile(join(root, path), "export const x = 1;\n")),
	);
	return root;
};

describe("a sibling that should be a member of a folder", () => {
	test("refuses a file whose stem is a sibling's stem plus a tail", () => {
		const faults = folderFaults(folder(["spawn.ts", "spawn-hook.ts"]));

		expect(faults).toHaveLength(1);
		expect(faults[0]).toContain("spawn-hook.ts sits beside spawn.ts");
	});

	test("allows two stems that only share a word, with no `-` between them", () => {
		expect(folderFaults(folder(["spawn.ts", "spawning.ts"]))).toEqual([]);
	});

	test("refuses two or more siblings that share a tail with no bare file", () => {
		const faults = folderFaults(folder(["failure-hook.ts", "stop-hook.ts"]));

		expect(faults).toHaveLength(1);
		expect(faults[0]).toContain("share the tail -hook");
	});

	test("allows one file with a tail, because one member is not a cluster", () => {
		expect(folderFaults(folder(["gate.ts", "tree-state.ts"]))).toEqual([]);
	});

	test("refuses a file whose stem repeats its own folder", () => {
		const faults = folderFaults(
			folder(["cli.ts", "evals-cli.ts"], "tools/evals"),
		);

		expect(faults.some((line) => line.includes("repeats its folder"))).toBe(
			true,
		);
	});

	test("allows the module that carries its folder's own name", () => {
		expect(
			folderFaults(folder(["gate.ts", "hooks.ts"], "plugins/x/gate")),
		).toEqual([]);
	});

	test("refuses a cluster of test files, which carry a marker before `.ts`", () => {
		const faults = folderFaults(folder(["plan.test.ts", "plan-cost.test.ts"]));

		expect(faults).toHaveLength(1);
		expect(faults[0]).toContain("plan-cost.test.ts sits beside plan.test.ts");
	});
});

describe("siblings that share a leading segment", () => {
	test("refuses two siblings sharing a head that no sibling carries alone", () => {
		const faults = folderFaults(folder(["evidence-foo.ts", "evidence-bar.ts"]));

		expect(faults).toHaveLength(1);
		expect(faults[0]).toContain("evidence-foo.ts, evidence-bar.ts");
		expect(faults[0]).toContain("folder named evidence/");
	});

	test("leaves a head carried alone to the prefix rule, so the count stays one", () => {
		const faults = folderFaults(
			folder(["usage.ts", "usage-evidence.ts", "usage-cost.ts"]),
		);

		expect(faults).toHaveLength(2);
		expect(faults.some((line) => line.includes("share the head"))).toBe(false);
	});

	test("allows a numeric shared segment, as a head and as a tail", () => {
		const head = folderFaults(folder(["0.2.0-run.ts", "0.2.0-evals.ts"]));
		const release = folderFaults(
			folder(["sandbox-run-0.2.0.ts", "evals-0.2.0.ts"]),
		);
		const ordinal = folderFaults(
			folder(["usage-evidence-2.ts", "handoff-cost-2.ts"]),
		);

		expect(head).toEqual([]);
		expect(release).toEqual([]);
		expect(ordinal).toEqual([]);
	});

	test("allows one sibling alone with a leading segment", () => {
		expect(folderFaults(folder(["evidence-foo.ts", "gate.ts"]))).toEqual([]);
	});

	test("allows a head cluster whose members differ by a number alone", () => {
		const faults = folderFaults(
			folder(["exports.md", "part-2.md", "part-3.md"], "docs/dossier/exports"),
		);

		expect(faults).toEqual([]);
	});

	test("refuses a head cluster where one member differs by a word", () => {
		const faults = folderFaults(folder(["part-2.md", "part-late.md"]));

		expect(faults).toHaveLength(1);
		expect(faults[0]).toContain("folder named part/");
	});
});

describe("a file named for a folder beside it", () => {
	test("refuses one file whose head is a sibling folder, where no other rule looks", async () => {
		const root = await treeOf([
			"docs/evidence/graders.md",
			"docs/evidence-new.md",
		]);

		const faults = (await readFolders(root)).flatMap(folderFaults);

		expect(faults).toHaveLength(1);
		expect(faults[0]).toContain("docs/evidence-new.md");
		expect(faults[0]).toContain("docs/evidence/new.md");
	});

	test("allows the same tree once the file is inside the folder", async () => {
		const root = await treeOf([
			"docs/evidence/graders.md",
			"docs/evidence/new.md",
		]);

		expect((await readFolders(root)).flatMap(folderFaults)).toEqual([]);
	});

	test("allows a file whose whole stem is the folder's name, which is an entry", () => {
		expect(folderFaults(folder(["gate.ts"], "tools", ["gate"]))).toEqual([]);
	});

	test("names the folder once for each file rather than asking for a new one", () => {
		const faults = folderFaults(
			folder(["evidence-foo.md", "evidence-bar.md"], "docs", ["evidence"]),
		);

		expect(faults).toHaveLength(2);
		expect(faults.some((line) => line.includes("share the head"))).toBe(false);
	});
});

describe("the pages the walk reads", () => {
	test("reads a Markdown cluster the way it reads a module cluster", async () => {
		const root = await treeOf(["docs/evidence-foo.md", "docs/evidence-bar.md"]);

		const faults = (await readFolders(root)).flatMap(folderFaults);

		expect(faults).toHaveLength(1);
		expect(faults[0]).toContain("folder named evidence/");
	});

	test("leaves `docs/keep/` alone, because another check owns its names", async () => {
		const root = await treeOf([
			"docs/keep/tools/evidence-foo.md",
			"docs/keep/tools/evidence-bar.md",
			"docs/keep/tools/evidence/one.md",
			"docs/keep/tools/evidence-new.md",
		]);

		const faults = (await readFolders(root)).flatMap(folderFaults);

		expect(faults).toEqual([]);
	});

	test("governs a folder called `keep` that is not `docs/keep/`", async () => {
		const root = await treeOf([
			"tools/keep/evidence-foo.ts",
			"tools/keep/evidence-bar.ts",
		]);

		const faults = (await readFolders(root)).flatMap(folderFaults);

		expect(faults).toHaveLength(1);
	});
});

describe("the file a fault message names", () => {
	test("names the file on disk and not the stem, for each of the three rules", () => {
		const prefix = folderFaults(folder(["plan.spec.ts", "plan-cost.spec.ts"]));
		const suffix = folderFaults(
			folder(["failure-hook.test.ts", "stop-hook.test.ts"]),
		);
		const repeat = folderFaults(
			folder(["evals-cli.spec.ts"], "tools/evals/__tests__"),
		);

		expect(prefix[0]).toContain("holding cost.spec.ts");
		expect(suffix[0]).toContain("failure-hook.test.ts, stop-hook.test.ts");
		expect(repeat[0]).toContain("the name is cli.spec.ts");
	});
});

describe("the names the walk reads", () => {
	test("takes either test marker off a stem, so a test is compared by its subject", () => {
		expect(stemOf("environment.spec.ts")).toBe("environment");
		expect(stemOf("environment.test.ts")).toBe("environment");
		expect(stemOf("environment.ts")).toBe("environment");
	});

	test("reads a `__tests__/` as belonging to the folder above it", () => {
		expect(concernOf("tools/evals/__tests__")).toBe("evals");
		expect(concernOf("tools/evals")).toBe("evals");
	});

	test("finds a planted cluster through the walk and leaves a clean tree alone", async () => {
		const bad = await treeOf(["tools/spawn.ts", "tools/spawn-hook.ts"]);
		const good = await treeOf(["tools/spawn.ts", "tools/hooks.ts"]);

		const faults = (await readFolders(bad)).flatMap(folderFaults);
		const clean = (await readFolders(good)).flatMap(folderFaults);

		expect(faults).toHaveLength(1);
		expect(clean).toEqual([]);
	});

	test("skips a type declaration, which is vendored rather than written here", async () => {
		const root = await treeOf(["tools/spawn.ts"]);
		await writeFile(
			join(root, "tools/spawn-hook.d.ts"),
			"export const x = 1;\n",
		);

		expect((await readFolders(root)).flatMap(folderFaults)).toEqual([]);
	});
});
