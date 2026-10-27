// Behavior of the SemVer compare of `tools/claude-code-release.ts`, which the eval workflow uses to find a newer Claude Code release.

import { expect, test } from "bun:test";
import path from "node:path";
import { file as bunFile } from "bun";
import { isNewer, pinnedVersion } from "../../tools/claude-code-release.ts";
import { MIN_CLAUDE_CODE_VERSION } from "../../tools/limits.ts";

const N_2_1_RE = /2\.1/;
const LATEST_RE = /latest/;

const CI = path.join(import.meta.dir, "../../.github/workflows/ci.yml");

test("a release that is the tested version is not newer", () => {
	expect(isNewer("2.1.296", "2.1.296")).toBe(false);
});

test("a patch, a minor, and a major release above the tested version are newer", () => {
	expect(isNewer("2.1.297", "2.1.296")).toBe(true);
	expect(isNewer("2.2.0", "2.1.296")).toBe(true);
	expect(isNewer("3.0.0", "2.99.99")).toBe(true);
});

test("a lower release is not newer, because the numbers compare as numbers", () => {
	expect(isNewer("2.1.295", "2.1.296")).toBe(false);
	expect(isNewer("2.1.10", "2.1.9")).toBe(true);
});

test("a pre-release of the tested version is lower than its release", () => {
	expect(isNewer("2.1.296-rc.1", "2.1.296")).toBe(false);
	expect(isNewer("2.1.296", "2.1.296-rc.1")).toBe(true);
});

test("pre-release identifiers compare by SemVer rules, with numbers as numbers", () => {
	expect(isNewer("2.1.297-rc.10", "2.1.297-rc.9")).toBe(true);
	expect(isNewer("2.1.297-rc.9", "2.1.297-rc.10")).toBe(false);
	expect(isNewer("2.1.297-alpha", "2.1.297-1")).toBe(true);
	expect(isNewer("2.1.297-rc", "2.1.297-rc.1")).toBe(false);
});

test("a leading `v` of a release tag is dropped, and build metadata does not count", () => {
	expect(isNewer("v2.1.297", "2.1.296")).toBe(true);
	expect(isNewer("v2.1.296", "2.1.296")).toBe(false);
	expect(isNewer("2.1.296+build.7", "2.1.296")).toBe(false);
	expect(isNewer("2.1.296", "2.1.296+build.7")).toBe(false);
});

test("text that is not a SemVer version throws, so a bad tag does not pass as newer", () => {
	expect(() => isNewer("latest", "2.1.296")).toThrow(LATEST_RE);
	expect(() => isNewer("2.1.297", "2.1")).toThrow(N_2_1_RE);
});

test("the version that `ci.yml` installs is the minimum version of the plugin", async () => {
	const pinned = pinnedVersion(await bunFile(CI).text());
	expect(pinned).toBe(MIN_CLAUDE_CODE_VERSION);
});

test("a `ci.yml` text without a pin throws", () => {
	expect(() =>
		pinnedVersion("run: npm install --global some-tool@1.0.0"),
	).toThrow();
});
