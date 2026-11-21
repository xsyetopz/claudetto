import { describe, expect, test } from "claude-code/testing";

import { dynamicWall, expandStatic, wallNames } from "../wall";

const WALL = "~/.claudetto-holdout";

describe("wall name forms", () => {
	test("literal variables and echo substitutions are filled in before the check", () => {
		// Act and Assert
		expect(expandStatic(`d=.claudetto; ls ~/\${d}-holdout`)).toContain(
			"ls ~/.claudetto-holdout"
		);
		expect(expandStatic("a=~ b='.claudetto-holdout'; cat $a/$b/t")).toContain(
			"cat ~/.claudetto-holdout/t"
		);
		expect(expandStatic("ls ~/$(echo .claudetto-holdout)")).toBe(
			"ls ~/.claudetto-holdout"
		);
		expect(expandStatic("ls `printf .claudetto-holdout`")).toBe(
			"ls .claudetto-holdout"
		);
		expect(expandStatic("ls $unset/x $(git rev-parse --show-toplevel)")).toBe(
			"ls $unset/x $(git rev-parse --show-toplevel)"
		);
	});

	test("a wall-depth folder built at run time is dynamic; deeper or project paths are not", () => {
		// Arrange
		const dynamic = [
			"ls ~/$x",
			"ls $HOME/$(pick)",
			`ls \${HOME}/\`pick\``,
			`ls /Users/u/\${x}y`,
			"ls $(echo ~)/.claudetto-holdout",
			"ls $d/.claudetto-holdout/t"
		];
		const fine = [
			"ls ~/.config/$x",
			"ls $HOME/.cache/$(pick)",
			"ls $PWD/src",
			"cat $(git rev-parse --show-toplevel)/README.md",
			"ls ~/work",
			"echo $HOME",
			"ls $x/holdout"
		];

		// Act
		const named = dynamic.map((c) => dynamicWall(c, WALL, "/Users/u"));
		const left = fine.map((c) => dynamicWall(c, WALL, "/Users/u"));

		// Assert
		expect(named.every(Boolean)).toBe(true);
		expect(left.some(Boolean)).toBe(false);
	});

	test("an absolute wall is named as written", () => {
		// Act and Assert
		expect(wallNames("/srv/holdout", "/Users/u")).toEqual(["/srv/holdout"]);
	});
});
