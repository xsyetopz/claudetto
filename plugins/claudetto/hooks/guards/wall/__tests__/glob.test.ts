import { describe, expect, test } from "claude-code/testing";

import { globHitsWall, globWords } from "../glob";

const WALL = "~/.claudetto-holdout";

describe("wall globs", () => {
	test("a glob that spells no part of the wall name still matches it", () => {
		// Arrange
		const hits = [
			"~/.c?audetto-h*",
			"$HOME/.[c]laudetto-*",
			"/Users/u/.*-holdout/*",
			'"~/.cl*"',
			"/Users/*/.claudetto-holdout",
			"~/.*",
			"~/.{claudetto-holdout,x}",
			"/Users/u/.claudetto-{holdout,y}"
		];
		const misses = [
			"~/*",
			"~/**",
			"~/.claudetto*x",
			"src/*.ts",
			"~/.aws*",
			"~/.{aws,ssh}",
			"src/{a,b}.ts"
		];

		// Act
		const hit = hits.map((glob) =>
			globHitsWall(globWords(`ls ${glob}`), WALL, "/Users/u")
		);
		const miss = misses.map((glob) =>
			globHitsWall(globWords(`ls ${glob}`), WALL, "/Users/u")
		);

		// Assert
		expect(hit.every(Boolean)).toBe(true);
		expect(miss.some(Boolean)).toBe(false);
	});

	test("a relative glob counts only after the command moves to home", () => {
		// Arrange
		const words = globWords("ls -a .c*");

		// Act and Assert
		expect(globHitsWall(words, WALL, "/Users/u", false)).toBe(false);
		expect(globHitsWall(words, WALL, "/Users/u", true)).toBe(true);
	});
});
