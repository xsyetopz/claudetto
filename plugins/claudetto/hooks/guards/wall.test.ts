import { describe, expect, test } from "claude-code/testing";

import { dynamicWall, expandStatic, globHitsWall, globWords, wallNames } from "./wall";

const FREE = { exitCode: 0, stdout: "System-wide memory free percentage: 50%\n", stderr: "", isStdoutTruncated: false, isStderrTruncated: false };

describe("wall guard", () => {
	test("a sandbox-off Bash call that names the holdout in any spelling is refused before it runs", async ($, on) => {
		// Arrange: the plugin registers its own hooks; this stub stands in for the tool.
		on("process.run", () => ({ value: FREE }));
		on("env.get", (_$, e) => ({ value: e.name === "HOME" ? "/Users/u" : undefined }));
		on("tool.check", () => ({ decision: "allow" }) as never);
		const ran: string[] = [];
		on("tool.call", { tool: "Bash" }, (_$, e) => {
			if (e.tool === "Bash") ran.push(e.command);
			return { result: "ok" } as never;
		});
		const spellings = ["ls ~/.claudetto-holdout", "cat $HOME/.claudetto-holdout/t.md", "find /Users/u/.claudetto-holdout"];

		// Act
		const results = [];
		for (const command of spellings) {
			results.push(await $.tool.call({ tool: "Bash", command, dangerouslyDisableSandbox: true }).catch((error: unknown) => error));
		}

		// Assert
		expect(ran).toEqual([]);
		for (const r of results) expect(JSON.stringify(r)).toContain("walled off");
	});

	test("a path padded with ./, // or x/.. that reaches the holdout is refused, and an unclosed [ does not open the wall", async ($, on) => {
		// Arrange
		on("process.run", () => ({ value: FREE }));
		on("env.get", (_$, e) => ({ value: e.name === "HOME" ? "/Users/u" : undefined }));
		on("tool.check", () => ({ decision: "allow" }) as never);
		const ran: string[] = [];
		on("tool.call", { tool: "Bash" }, (_$, e) => {
			if (e.tool === "Bash") ran.push(e.command);
			return { result: "ok" } as never;
		});
		const spellings = ["cat ~/./.claudetto-holdout/t", "cat ~//.claudetto-holdout/t", "cat ~/src/../.claudetto-holdout/t", "ls ~/[ ~/$x"];

		// Act
		const results = [];
		for (const command of spellings) {
			results.push(await $.tool.call({ tool: "Bash", command, dangerouslyDisableSandbox: true }).catch((error: unknown) => error));
		}

		// Assert
		expect(ran).toEqual([]);
		for (const r of results) expect(JSON.stringify(r)).toContain("walled off");
	});

	test("a Bash call that names no wall runs", async ($, on) => {
		// Arrange
		on("process.run", () => ({ value: FREE }));
		on("tool.check", () => ({ decision: "allow" }) as never);
		const ran: string[] = [];
		on("tool.call", { tool: "Bash" }, (_$, e) => {
			if (e.tool === "Bash") ran.push(e.command);
			return { result: "ok" } as never;
		});

		// Act
		await $.tool.call({ tool: "Bash", command: "ls ~/.claudetto", dangerouslyDisableSandbox: true });

		// Assert
		expect(ran.length).toBe(1);
	});

	test("a sibling folder that shares the wall's name as a prefix runs", async ($, on) => {
		// Arrange
		on("process.run", () => ({ value: FREE }));
		on("env.get", (_$, e) => ({ value: e.name === "HOME" ? "/Users/u" : undefined }));
		on("tool.check", () => ({ decision: "allow" }) as never);
		const ran: string[] = [];
		on("tool.call", { tool: "Bash" }, (_$, e) => {
			if (e.tool === "Bash") ran.push(e.command);
			return { result: "ok" } as never;
		});
		const siblings = ["ls ~/.claudetto-holdout-old", "cat $HOME/.claudetto-holdout2/t.md"];

		// Act
		for (const command of siblings) await $.tool.call({ tool: "Bash", command, dangerouslyDisableSandbox: true });

		// Assert: another guard wraps a command that runs, so each sibling is looked for inside what ran.
		expect(ran.length).toBe(siblings.length);
		siblings.forEach((command, i) => expect(ran[i]).toContain(command));
	});

	test("a glob that spells no part of the wall name still matches it", () => {
		// Arrange
		const wall = "~/.claudetto-holdout";
		const hits = ["~/.c?audetto-h*", "$HOME/.[c]laudetto-*", "/Users/u/.*-holdout/*", '"~/.cl*"', "/Users/*/.claudetto-holdout", "~/.*", "~/.{claudetto-holdout,x}", "/Users/u/.claudetto-{holdout,y}"];
		const misses = ["~/*", "~/**", "~/.claudetto*x", "src/*.ts", "~/.aws*", "~/.{aws,ssh}", "src/{a,b}.ts"];

		// Act and Assert
		for (const glob of hits) expect(globHitsWall(globWords(`ls ${glob}`), wall, "/Users/u")).toBe(true);
		for (const glob of misses) expect(globHitsWall(globWords(`ls ${glob}`), wall, "/Users/u")).toBe(false);
	});

	test("a relative glob counts only after the command moves to home", () => {
		// Arrange
		const wall = "~/.claudetto-holdout";
		const words = globWords("ls -a .c*");

		// Act and Assert
		expect(globHitsWall(words, wall, "/Users/u", false)).toBe(false);
		expect(globHitsWall(words, wall, "/Users/u", true)).toBe(true);
	});

	test("a sandbox-off call with such a glob is refused before it runs", async ($, on) => {
		// Arrange
		on("process.run", () => ({ value: FREE }));
		on("env.get", (_$, e) => ({ value: e.name === "HOME" ? "/Users/u" : undefined }));
		on("tool.check", () => ({ decision: "allow" }) as never);
		const ran: string[] = [];
		on("tool.call", { tool: "Bash" }, (_$, e) => {
			if (e.tool === "Bash") ran.push(e.command);
			return { result: "ok" } as never;
		});

		// Act
		const result = await $.tool.call({ tool: "Bash", command: "ls ~/.c?audetto-h*", dangerouslyDisableSandbox: true }).catch((error: unknown) => error);

		// Assert
		expect(ran).toEqual([]);
		expect(JSON.stringify(result)).toContain("walled off");
	});

	test("a project glob runs and a glob after cd ~ is refused", async ($, on) => {
		// Arrange
		on("process.run", () => ({ value: FREE }));
		on("env.get", (_$, e) => ({ value: e.name === "HOME" ? "/Users/u" : undefined }));
		on("tool.check", () => ({ decision: "allow" }) as never);
		const ran: string[] = [];
		on("tool.call", { tool: "Bash" }, (_$, e) => {
			if (e.tool === "Bash") ran.push(e.command);
			return { result: "ok" } as never;
		});

		// Act
		for (const command of ["ls -a .*", "git add .c*", "cd ~ && ls .c*-holdout", "cd; cat .c?audetto-holdout/t"]) {
			await $.tool.call({ tool: "Bash", command, dangerouslyDisableSandbox: true }).catch(() => undefined);
		}

		// Assert
		expect(ran.length).toBe(2);
		expect(ran[0]).toContain("ls -a .*");
		expect(ran[1]).toContain("git add .c*");
	});

	test("literal variables and echo substitutions are filled in before the check", () => {
		// Act and Assert
		expect(expandStatic("d=.claudetto; ls ~/${d}-holdout")).toContain("ls ~/.claudetto-holdout");
		expect(expandStatic("a=~ b='.claudetto-holdout'; cat $a/$b/t")).toContain("cat ~/.claudetto-holdout/t");
		expect(expandStatic("ls ~/$(echo .claudetto-holdout)")).toBe("ls ~/.claudetto-holdout");
		expect(expandStatic("ls `printf .claudetto-holdout`")).toBe("ls .claudetto-holdout");
		expect(expandStatic("ls $unset/x $(git rev-parse --show-toplevel)")).toBe("ls $unset/x $(git rev-parse --show-toplevel)");
	});

	test("a wall-depth folder built at run time is dynamic; deeper or project paths are not", () => {
		// Arrange
		const wall = "~/.claudetto-holdout";
		const dynamic = ["ls ~/$x", "ls $HOME/$(pick)", "ls ${HOME}/`pick`", "ls /Users/u/${x}y", "ls $(echo ~)/.claudetto-holdout", "ls $d/.claudetto-holdout/t"];
		const fine = ["ls ~/.config/$x", "ls $HOME/.cache/$(pick)", "ls $PWD/src", "cat $(git rev-parse --show-toplevel)/README.md", "ls ~/work", "echo $HOME", "ls $x/holdout"];

		// Act and Assert
		for (const c of dynamic) expect(dynamicWall(c, wall, "/Users/u")).toBe(true);
		for (const c of fine) expect(dynamicWall(c, wall, "/Users/u")).toBe(false);
	});

	test("a call that builds the wall name by variable or substitution is refused; ordinary ones run", async ($, on) => {
		// Arrange
		on("process.run", () => ({ value: FREE }));
		on("env.get", (_$, e) => ({ value: e.name === "HOME" ? "/Users/u" : undefined }));
		on("tool.check", () => ({ decision: "allow" }) as never);
		const ran: string[] = [];
		on("tool.call", { tool: "Bash" }, (_$, e) => {
			if (e.tool === "Bash") ran.push(e.command);
			return { result: "ok" } as never;
		});
		const refused = ["d=.claudetto; ls ~/${d}-holdout", "ls ~/$(echo .claudetto-holdout)", "n=holdout; ls $HOME/.claudetto-$n", "ls ~/$x", "ls $(echo ~)/.claudetto-holdout", "cd ~ && ls $(echo .claudetto-holdout)", "r=/Users; ls $r/u/.claudetto-holdout", "ls $(echo /Users/u)/.claudetto-holdout"];
		const allowed = ["ls $HOME/.config/$x", "echo $HOME $PWD", "cd $(git rev-parse --show-toplevel) && ls src", "f=a.ts; cat src/$f", "for f in src/*.ts; do wc -l $f; done"];

		// Act
		for (const command of [...refused, ...allowed]) await $.tool.call({ tool: "Bash", command, dangerouslyDisableSandbox: true }).catch(() => undefined);

		// Assert
		// Another hook wraps a command that runs, so match by containment.
		expect(ran.length).toBe(allowed.length);
		for (const [i, command] of allowed.entries()) expect(ran[i]).toContain(command);
	});

	test("an absolute wall is named as written", () => {
		// Act and Assert
		expect(wallNames("/srv/holdout", "/Users/u")).toEqual(["/srv/holdout"]);
	});
});
