import { describe, expect, test } from "bun:test";
import { binaryNames, isOnPath } from "../locate.ts";
import { AST_GREP } from "../tools.ts";

const UNIX = { platform: "darwin", arch: "arm64" };
const LINUX = { platform: "linux", arch: "x64" };
const WINDOWS = { platform: "win32", arch: "x64" };

const existing =
	(...paths: string[]) =>
	async (path: string) =>
		paths.includes(path);

describe("`binaryNames`", () => {
	test("macOS names both binaries", () => {
		expect(binaryNames(AST_GREP, UNIX)).toEqual(["ast-grep", "sg"]);
	});

	test("Linux leaves out `sg`, which the shadow tools own", () => {
		expect(binaryNames(AST_GREP, LINUX)).toEqual(["ast-grep"]);
	});

	test("Windows adds the executable suffixes", () => {
		expect(binaryNames(AST_GREP, WINDOWS)).toEqual([
			"ast-grep.exe",
			"ast-grep.cmd",
			"sg.exe",
			"sg.cmd",
		]);
	});
});

describe("`isOnPath`", () => {
	test("finds a binary in a later folder of the `PATH`", async () => {
		const found = await isOnPath(["sg"], UNIX, "/a:/b:/c", existing("/c/sg"));

		expect(found).toBe(true);
	});

	test("an unset `PATH` finds nothing", async () => {
		expect(await isOnPath(["sg"], UNIX, undefined, existing("/a/sg"))).toBe(
			false,
		);
	});

	test("a binary in no folder is missing", async () => {
		expect(await isOnPath(["sg"], UNIX, "/a:/b", existing("/z/sg"))).toBe(
			false,
		);
	});

	test("an empty entry of the `PATH` is skipped", async () => {
		expect(await isOnPath(["sg"], UNIX, ":/a:", existing("/sg"))).toBe(false);
	});

	test("Windows splits on a semicolon and joins with a backslash", async () => {
		const found = await isOnPath(
			["ast-grep.exe"],
			WINDOWS,
			"C:\\x;C:\\tools",
			existing("C:\\tools\\ast-grep.exe"),
		);

		expect(found).toBe(true);
	});
});
