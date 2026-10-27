// The pure rules of the `protect` slice: the field `bashEditDiff`, the transport of a URL, and the ref lines.

import { expect, test } from "bun:test";
import {
	diffPaths,
	parseRefs,
	transportOf,
} from "../../../../plugins/claudetto/modules/work/protect/domain/protect.ts";

test("`diffPaths` lists the changed files of a usable field", () => {
	expect(
		diffPaths({ bashEditDiff: { changedFiles: ["/a", 1, "/b"] } }),
	).toEqual(["/a", "/b"]);
});

test("`diffPaths` gives `undefined` for a missing, unavailable, skipped, or cut field", () => {
	expect(diffPaths(undefined)).toBeUndefined();
	expect(diffPaths("text")).toBeUndefined();
	expect(diffPaths({ bashEditDiff: null })).toBeUndefined();
	expect(diffPaths({ bashEditDiff: { unavailable: true } })).toBeUndefined();
	expect(diffPaths({ bashEditDiff: { skipped: "big" } })).toBeUndefined();
	expect(
		diffPaths({ bashEditDiff: { moreFiles: 2, changedFiles: ["/a"] } }),
	).toBeUndefined();
	expect(diffPaths({ bashEditDiff: {} })).toBeUndefined();
});

test("`transportOf` tells `ssh`, `git`, and `http`", () => {
	expect(transportOf("ssh://host/x")).toBe("ssh");
	expect(transportOf("me@host:x")).toBe("ssh");
	expect(transportOf("git://host/x")).toBe("git");
	expect(transportOf("https://host/x")).toBe("http");
});

test("`parseRefs` keeps the lines with a sha and a ref", () => {
	expect(parseRefs("abc refs/heads/main\n\nlonely")).toEqual([
		["abc", "refs/heads/main"],
	]);
});
