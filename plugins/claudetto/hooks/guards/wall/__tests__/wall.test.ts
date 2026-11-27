import { describe, expect, test } from "claude-code/testing";

import { attempt, attemptEach, stubBash, stubHome } from "./harness";

describe("wall guard", () => {
	test("a sandbox-off Bash call that names the holdout in any spelling is refused before it runs", async ($, on) => {
		// Arrange: the plugin registers its own hooks; the stub stands in for the tool.
		stubHome(on);
		const ran = stubBash(on);

		// Act
		const results = await attemptEach($, [
			"ls ~/.claudetto-holdout",
			"cat $HOME/.claudetto-holdout/t.md",
			"find /Users/u/.claudetto-holdout"
		]);

		// Assert
		expect(ran).toEqual([]);
		expect(results.every((r) => JSON.stringify(r).includes("walled off"))).toBe(
			true
		);
	});

	test("a path padded with ./, // or x/.. that reaches the holdout is refused, and an unclosed [ does not open the wall", async ($, on) => {
		// Arrange
		stubHome(on);
		const ran = stubBash(on);

		// Act
		const results = await attemptEach($, [
			"cat ~/./.claudetto-holdout/t",
			"cat ~//.claudetto-holdout/t",
			"cat ~/src/../.claudetto-holdout/t",
			"ls ~/[ ~/$x"
		]);

		// Assert
		expect(ran).toEqual([]);
		expect(results.every((r) => JSON.stringify(r).includes("walled off"))).toBe(
			true
		);
	});

	test("a failed HOME read leaves a debug line and the ~/ spelling is still refused", async ($, on) => {
		// Arrange
		on("env.get", () => {
			throw new Error("env closed");
		});
		const lines: string[] = [];
		on("ui.log", (_$, e) => {
			lines.push(`${e.to}: ${e.text}`);
			return { value: undefined };
		});
		const ran = stubBash(on);

		// Act
		const r = await attempt($, "ls ~/.claudetto-holdout");

		// Assert
		expect(ran).toEqual([]);
		expect(JSON.stringify(r)).toContain("walled off");
		expect(lines.some((l) => l.startsWith("debug: wall home failed:"))).toBe(
			true
		);
	});

	test("a Bash call that names no wall runs", async ($, on) => {
		// Arrange
		const ran = stubBash(on);

		// Act
		await attempt($, "ls ~/.claudetto");

		// Assert
		expect(ran.length).toBe(1);
	});

	test("a sibling folder that shares the wall's name as a prefix runs", async ($, on) => {
		// Arrange
		stubHome(on);
		const ran = stubBash(on);
		const siblings = [
			"ls ~/.claudetto-holdout-old",
			"cat $HOME/.claudetto-holdout2/t.md"
		];

		// Act
		await attemptEach($, siblings);

		// Assert: another guard wraps a command that runs, so each sibling is looked for inside what ran.
		expect(ran.length).toBe(siblings.length);
		for (const [i, command] of siblings.entries()) {
			expect(ran[i]).toContain(command);
		}
	});

	test("a sandbox-off call with such a glob is refused before it runs", async ($, on) => {
		// Arrange
		stubHome(on);
		const ran = stubBash(on);

		// Act
		const result = await attempt($, "ls ~/.c?audetto-h*");

		// Assert
		expect(ran).toEqual([]);
		expect(JSON.stringify(result)).toContain("walled off");
	});

	test("a project glob runs and a glob after cd ~ is refused", async ($, on) => {
		// Arrange
		stubHome(on);
		const ran = stubBash(on);

		// Act
		await attemptEach($, [
			"ls -a .*",
			"git add .c*",
			"cd ~ && ls .c*-holdout",
			"cd; cat .c?audetto-holdout/t"
		]);

		// Assert
		expect(ran.length).toBe(2);
		expect(ran[0]).toContain("ls -a .*");
		expect(ran[1]).toContain("git add .c*");
	});

	test("a call that builds the wall name by variable or substitution is refused; ordinary ones run", async ($, on) => {
		// Arrange
		stubHome(on);
		const ran = stubBash(on);
		const refused = [
			`d=.claudetto; ls ~/\${d}-holdout`,
			"ls ~/$(echo .claudetto-holdout)",
			"n=holdout; ls $HOME/.claudetto-$n",
			"ls ~/$x",
			"ls $(echo ~)/.claudetto-holdout",
			"cd ~ && ls $(echo .claudetto-holdout)",
			"r=/Users; ls $r/u/.claudetto-holdout",
			"ls $(echo /Users/u)/.claudetto-holdout"
		];
		const allowed = [
			"ls $HOME/.config/$x",
			"echo $HOME $PWD",
			"cd $(git rev-parse --show-toplevel) && ls src",
			"f=a.ts; cat src/$f",
			"for f in src/*.ts; do wc -l $f; done"
		];

		// Act
		await attemptEach($, [...refused, ...allowed]);

		// Assert
		// Another hook wraps a command that runs, so match by containment.
		expect(ran.length).toBe(allowed.length);
		for (const [i, command] of allowed.entries()) {
			expect(ran[i]).toContain(command);
		}
	});

	test("a call that fills in the wall name from literals or substitutions is refused", async ($, on) => {
		// Arrange
		stubHome(on);
		const ran = stubBash(on);

		// Act
		const results = await attemptEach($, [
			"a=~ b='.claudetto-holdout'; cat $a/$b/t",
			"ls ~/`printf .claudetto-holdout`",
			"ls $HOME/$(pick)",
			`ls \${HOME}/\`pick\``,
			`ls /Users/u/\${x}y`,
			"ls $d/.claudetto-holdout/t"
		]);

		// Assert
		expect(ran).toEqual([]);
		expect(results.every((r) => JSON.stringify(r).includes("walled off"))).toBe(
			true
		);
	});

	test("a path that cannot reach the wall's depth runs, however it is built", async ($, on) => {
		// Arrange
		stubHome(on);
		const ran = stubBash(on);
		const fine = [
			"ls ~/.config/$x",
			"ls $HOME/.cache/$(pick)",
			"ls $PWD/src",
			"cat $(git rev-parse --show-toplevel)/README.md",
			"ls ~/work",
			"ls $x/holdout"
		];

		// Act
		await attemptEach($, fine);

		// Assert
		expect(ran).toHaveLength(fine.length);
		for (const [i, command] of fine.entries()) {
			expect(ran[i]).toContain(command);
		}
	});

	test("a glob that spells no part of the wall name but matches it is refused", async ($, on) => {
		// Arrange
		stubHome(on);
		const ran = stubBash(on);

		// Act
		const results = await attemptEach($, [
			"ls $HOME/.[c]laudetto-*",
			"ls /Users/u/.*-holdout/*",
			'ls "~/.cl*"',
			"ls /Users/*/.claudetto-holdout",
			"ls ~/.*",
			"ls ~/.{claudetto-holdout,x}",
			"ls /Users/u/.claudetto-{holdout,y}"
		]);

		// Assert
		expect(ran).toEqual([]);
		expect(results.every((r) => JSON.stringify(r).includes("walled off"))).toBe(
			true
		);
	});

	test("a glob that cannot match the wall runs", async ($, on) => {
		// Arrange
		stubHome(on);
		const ran = stubBash(on);
		const fine = [
			"ls ~/*",
			"ls ~/**",
			"ls ~/.claudetto*x",
			"ls src/*.ts",
			"ls ~/.aws*",
			"ls ~/.{aws,ssh}",
			"ls src/{a,b}.ts"
		];

		// Act
		await attemptEach($, fine);

		// Assert
		expect(ran).toHaveLength(fine.length);
	});

	test(
		"a protected path outside home is refused as written",
		{ options: { protectedPaths: ["/srv/holdout"] } },
		async ($, on) => {
			// Arrange
			stubHome(on);
			const ran = stubBash(on);

			// Act
			const refused = await attempt($, "cat /srv/holdout/notes.md");
			await attempt($, "cat /srv/other/notes.md");

			// Assert
			expect(JSON.stringify(refused)).toContain("walled off");
			expect(ran).toHaveLength(1);
			expect(ran[0]).toContain("/srv/other/notes.md");
		}
	);
});
