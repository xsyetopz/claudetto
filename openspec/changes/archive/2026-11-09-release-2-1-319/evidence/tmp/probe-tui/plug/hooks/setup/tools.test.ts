import { expect, test } from "claude-code/testing";
import {
	INSTALL,
	isBelowFloor,
	isOnPath,
	noticeLine,
	RELEASES_PAGE,
} from "./tools.ts";

const holds =
	(...files: string[]) =>
	async (file: string) =>
		files.includes(file);

test("a name in any PATH folder is found, and a name in none is not", async () => {
	expect(await isOnPath("ast-grep", "/a:/b", holds("/b/ast-grep"))).toBe(true);
	expect(await isOnPath("ast-grep", "/a:/b", holds("/c/ast-grep"))).toBe(false);
	expect(await isOnPath("ast-grep", undefined, holds())).toBe(false);
});

test("the notice names brew's command when brew exists and the releases page otherwise", () => {
	expect(noticeLine(true)).toContain(INSTALL.join(" "));
	expect(noticeLine(false)).toContain(RELEASES_PAGE);
});

test("a release below the floor is below, an equal or later one and a prerelease of the floor are not", () => {
	expect(isBelowFloor("2.1.311", "2.1.316")).toBe(true);
	expect(isBelowFloor("2.1.316", "2.1.316")).toBe(false);
	expect(isBelowFloor("2.1.318", "2.1.316")).toBe(false);
	expect(isBelowFloor("2.10.0", "2.1.316")).toBe(false);
	expect(isBelowFloor("2.1.311-dev", "2.1.316")).toBe(true);
});
