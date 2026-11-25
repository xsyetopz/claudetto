import { describe, expect, test } from "claude-code/testing";

import {
	blockKey,
	SHORT,
	shortConfig,
	shortList,
	shortSandbox
} from "../sandbox";
import { SANDBOX_2_1_329 as FIXTURE } from "./fixtures/sandbox";

const AT = { home: "/Users/dev", cwd: "/Users/dev/work/app" };

const prose = (text: string): string[] => {
	const out: string[] = [];
	for (const line of text.split("\n")) {
		const last = out.length - 1;
		if (line.startsWith("  - ") && out[last]?.startsWith(" - ") === true) {
			out[last] = `${out[last]}\n${line}`;
		} else {
			out.push(line);
		}
	}
	return out.filter(
		(b) => b !== "" && !b.startsWith("#") && !b.startsWith("Filesystem: ")
	);
};

describe("sandbox instructions", () => {
	test("each 2.1.329 paragraph and bullet has a shorter text in the table", () => {
		// Arrange
		const blocks = prose(FIXTURE);

		// Act
		const missing = blocks.filter((b) => SHORT[blockKey(b)] === undefined);
		const longer = blocks.filter(
			(b) => (SHORT[blockKey(b)] ?? "").length >= b.length
		);

		// Assert
		expect(blocks).toHaveLength(15);
		expect(missing).toEqual([]);
		expect(longer).toEqual([]);
	});

	test("the shortened text fits 2,000 tokens at 3 characters a token and keeps the heading and every rule's anchor", () => {
		// Arrange
		const text = FIXTURE;

		// Act
		const short = shortSandbox(text, AT);

		// Assert
		expect(short.length).toBeLessThanOrEqual(6000);
		expect(short.length).toBeLessThan(text.length);
		expect(short.startsWith("## Bash command sandbox\n")).toBe(true);
		for (const anchor of [
			"dangerouslyDisableSandbox: true",
			"<sandbox_violations>",
			"allowed_domains",
			"/sandbox",
			"~/.ssh/*",
			"osascript",
			"AccessDenied",
			"$TMPDIR",
			".git/worktrees",
			"/copy",
			"cloud metadata"
		]) {
			expect(short).toContain(anchor);
		}
	});

	test("a paragraph the table does not know passes through unchanged", () => {
		// Arrange
		const text =
			"## Bash command sandbox\n - A rule from a later build.\n  - Its detail.\n";

		// Act
		const short = shortSandbox(text, AT);

		// Assert
		expect(short).toBe(text);
	});
});

describe("sandbox config line", () => {
	test("paths take ~ and . and the /tmp link, lose duplicates, and share their folder", () => {
		// Arrange
		const paths = [
			"/Users/dev/.aws",
			"~/.aws",
			"/Users/dev/.azure",
			"/private/tmp/claude-501",
			"/tmp/claude-501",
			"/Users/dev/work/app/.claude/settings.json",
			"/Users/dev/work/app/.claude/hooks",
			"**/.env",
			"**/.env.local",
			"... and 12 more (truncated for prompt size)"
		];

		// Act
		const line = shortList(paths, AT);

		// Assert
		expect(line).toBe(
			"~/{.aws,.azure}, /tmp/claude-501, ./.claude/{settings.json,hooks}, **/{.env,.env.local}, +12 more"
		);
	});

	test("a JSON config line becomes one list per key path", () => {
		// Arrange
		const line =
			'Filesystem: {"read":{"denyOnly":["/Users/dev/.netrc"]},"write":{"allowOnly":[".","/Users/dev/work/app/out"]}}';

		// Act
		const short = shortConfig(line, AT);

		// Assert
		expect(short).toBe(
			"Filesystem read.denyOnly: ~/.netrc; write.allowOnly: ., ./out"
		);
	});

	test("a config line that is not JSON passes through unchanged", () => {
		// Arrange
		const text = "## Bash command sandbox\nFilesystem: {not json\n";

		// Act
		const short = shortSandbox(text, AT);

		// Assert
		expect(short).toBe(text);
	});
});

describe("sandbox hook", () => {
	test("rewrites the sandbox attachment and leaves another kind as it came", async ($, on) => {
		// Arrange
		on("env.get", () => ({ value: AT.home }));
		on("session.cwd", () => ({ value: AT.cwd }));
		on("prompt.attachment", (_$, e) => ({ text: e.text }));
		const text = FIXTURE;
		const origin = { kind: "engine" } as const;

		// Act
		const sandbox = await $.prompt.attachment({
			type: "sandbox_instructions",
			text,
			origin
		});
		const other = await $.prompt.attachment({
			type: "date",
			text: "Today is a day.",
			origin
		});

		// Assert
		expect(sandbox.text).toBe(shortSandbox(text, AT));
		expect(other.text).toBe("Today is a day.");
	});
});
