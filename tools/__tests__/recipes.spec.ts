// The recipe rule, checked on a planted `justfile` and planted pages. Each case asserts the decision,
// which is whether a fault stands at a line for a named recipe, and not the wording of the message.

import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	faultsOf,
	isRecord,
	namedIn,
	recipeFaultsIn,
	recipeNames,
} from "../recipes.ts";

const JUSTFILE = `set positional-arguments

count := 1

# List recipes
default:
    @just --list

# Run the test suite
test *args:
    bun test "$@"

@silent:
    bun run quiet

greet name="world":
    echo "$1"

check: lint test
`;

/** Where a fault stands and what it names, which is the decision the rule makes. */
interface Where {
	readonly page: string;
	readonly line: number;
	readonly recipe: string;
}

/** The faults of a planted page against the planted `justfile`, which is the rule end to end. */
const faultsIn = (text: string): Where[] =>
	faultsOf(recipeNames(JUSTFILE), namedIn("planted.md", text)).map(
		({ page, line, recipe }) => ({ page, line, recipe }),
	);

describe("the recipes a justfile defines", () => {
	test("reads a bare name, parameters, a default, and dependencies", () => {
		expect(recipeNames(JUSTFILE)).toEqual([
			"default",
			"test",
			"silent",
			"greet",
			"check",
		]);
	});

	test("reads no name from an assignment, a setting, or an indented command", () => {
		const names = recipeNames(JUSTFILE);

		expect(names).not.toContain("count");
		expect(names).not.toContain("set");
		expect(names).not.toContain("bun");
	});
});

describe("a page that names a recipe the justfile does not define", () => {
	test("refuses it and gives its line and the name", () => {
		const text = `# Changelog

Change versions only with \`just bump\`.
`;

		expect(faultsIn(text)).toEqual([
			{ page: "planted.md", line: 3, recipe: "bump" },
		]);
	});

	test("allows a name the justfile defines", () => {
		expect(faultsIn("Run `just check` before a pull request.\n")).toEqual([]);
	});

	test("refuses every occurrence, so one fixed line does not hide another", () => {
		const text = `Run \`just sandbox\`.
Then run \`just check\`.
Then run \`just docker\`.
`;

		expect(faultsIn(text)).toEqual([
			{ page: "planted.md", line: 1, recipe: "sandbox" },
			{ page: "planted.md", line: 3, recipe: "docker" },
		]);
	});

	test("reads a name that follows another command in the same span", () => {
		expect(faultsIn("Run `bun install && just gate` first.\n")).toEqual([
			{ page: "planted.md", line: 1, recipe: "gate" },
		]);
	});
});

describe("a span that is not a recipe", () => {
	test("leaves a long flag alone", () => {
		expect(faultsIn("Run `just --list` to see them.\n")).toEqual([]);
	});

	test("reads a name only inside a backticked span", () => {
		expect(faultsIn("The old just bump command is gone.\n")).toEqual([]);
	});

	test("leaves the English adverb inside a quoted span alone", () => {
		expect(faultsIn("One author says `it just works` for them.\n")).toEqual([]);
		expect(faultsIn("Another says `opus is just better`.\n")).toEqual([]);
	});
});

describe("the record pages", () => {
	test("takes `docs/test-diet.md` and `CHANGELOG.md` as records", () => {
		expect(isRecord("docs/test-diet.md")).toBe(true);
		expect(isRecord("CHANGELOG.md")).toBe(true);
	});

	test("takes the evidence page of the removed eval harness as a record", () => {
		expect(isRecord("docs/evidence/evals/evals.md")).toBe(true);
	});

	test("keeps an evidence page that names a live recipe under the check", () => {
		expect(isRecord("docs/evidence/compaction/threshold.md")).toBe(false);
	});

	test("takes a root page and a live page as an instruction", () => {
		expect(isRecord("CONTRIBUTING.md")).toBe(false);
		expect(isRecord("docs/levers.md")).toBe(false);
	});
});

describe("the whole check over a planted tree", () => {
	test("reports a page under `docs/` and skips a record page", async () => {
		const root = await mkdtemp(join(tmpdir(), "recipes-root-"));
		await mkdir(join(root, "docs"), { recursive: true });
		await writeFile(join(root, "justfile"), JUSTFILE);
		await writeFile(join(root, "docs", "live.md"), "Run `just gone`.\n");
		await writeFile(join(root, "docs", "test-diet.md"), "Ran `just gone`.\n");

		const found = await recipeFaultsIn(root);

		expect(found.map(({ page, recipe }) => ({ page, recipe }))).toEqual([
			{ page: "docs/live.md", recipe: "gone" },
		]);
	});
});
