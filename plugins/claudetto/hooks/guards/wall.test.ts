import { describe, expect, test } from "claude-code/testing";

import { globHitsWall, globWords, wallNames } from "./wall";

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

	test("a glob that spells no part of the wall name still matches it", () => {
		// Arrange
		const wall = "~/.claudetto-holdout";
		const hits = ["~/.c?audetto-h*", "$HOME/.[c]laudetto-*", "/Users/u/.*-holdout/*", '"~/.cl*"'];
		const misses = ["~/*", "~/**", "~/.claudetto*x", "src/*.ts", "~/.aws*"];

		// Act and Assert
		for (const glob of hits) expect(globHitsWall(globWords(`ls ${glob}`), wall, "/Users/u")).toBe(true);
		for (const glob of misses) expect(globHitsWall(globWords(`ls ${glob}`), wall, "/Users/u")).toBe(false);
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

	test("an absolute wall is named as written", () => {
		// Act and Assert
		expect(wallNames("/srv/holdout", "/Users/u")).toEqual(["/srv/holdout"]);
	});
});
