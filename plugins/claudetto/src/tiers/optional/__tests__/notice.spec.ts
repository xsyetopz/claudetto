import { describe, expect, test } from "bun:test";
import { installFor } from "../install.ts";
import { isQuiet, noticeKey, noticeLine, RELEASES_PAGE } from "../notice.ts";
import { AST_GREP } from "../tools.ts";

describe("noticeLine", () => {
	test("names the `brew` command and `/claudetto:setup`", () => {
		const line = noticeLine(
			AST_GREP,
			installFor(AST_GREP, { platform: "darwin", arch: "arm64" }, true),
		);

		expect(line).toContain("`brew install ast-grep`");
		expect(line).toContain("`/claudetto:setup`");
		expect(line).toContain("on your `PATH`");
		expect(line).not.toContain("\n");
	});

	test("names the zip and the folder without a package manager", () => {
		const line = noticeLine(
			AST_GREP,
			installFor(AST_GREP, { platform: "linux", arch: "x64" }, false),
		);

		expect(line).toContain("app-x86_64-unknown-linux-gnu.zip");
		expect(line).toContain("~/.local/bin");
	});

	test("points at the releases for a platform with none", () => {
		const line = noticeLine(AST_GREP, { kind: "none" });

		expect(line).toContain(RELEASES_PAGE);
	});
});

describe("isQuiet", () => {
	test("is quiet for the pinned version only", () => {
		expect(isQuiet(AST_GREP.version, AST_GREP)).toBe(true);
		expect(isQuiet("0.50.0", AST_GREP)).toBe(false);
		expect(isQuiet(undefined, AST_GREP)).toBe(false);
	});

	test("keys the store by the tool", () => {
		expect(noticeKey(AST_GREP)).toBe("optional-tool:ast-grep");
	});
});
