import { expect, test } from "claude-code/testing";

import { isOnPath, noticeLine, TOOLS } from "./tools";

const holds =
	(...files: string[]) =>
	(file: string) =>
		Promise.resolve(files.includes(file));

test("a name in any PATH folder is found, and a name in none is not", async () => {
	expect(await isOnPath("ast-grep", "/a:/b", holds("/b/ast-grep"))).toBe(true);
	expect(await isOnPath("ast-grep", "/a:/b", holds("/c/ast-grep"))).toBe(false);
	expect(await isOnPath("ast-grep", undefined, holds())).toBe(false);
});

test("the notice names brew's command when brew exists and the releases page otherwise", () => {
	for (const tool of TOOLS) {
		expect(noticeLine(tool, true)).toContain(tool.install.join(" "));
		expect(noticeLine(tool, false)).toContain(tool.releases);
	}
});
