import { describe, expect, mock, test } from "claude-code/testing";

import { fieldOf } from "../../shared/field";
import { serve } from "./serve";

describe("settings fill at session start", () => {
	test("session start returns within the load wait while each engine settings read answers slowly and never with the written value", async ($, on) => {
		// Arrange
		serve(on, '{"outputStyle": "Proactive"}', {}, (key, sleep) =>
			key === "outputStyle"
				? sleep(1500).then(() => ({ value: {} }))
				: { value: {} }
		);
		const began = Date.now();

		// Act
		await $.session.start({
			cwd: "/home/u/p",
			surface: null,
			isInteractive: true
		});

		// Assert
		expect(Date.now() - began).toBeLessThan(4500);
	});

	test("session start returns 5 seconds in while a settings file read never answers", async ($, on) => {
		// Arrange
		const clock = mock.clock(on);
		on("session.start", (_$, e) => ({ cwd: e.cwd }));
		on("env.get", (_$, e) => ({
			value: e.name === "HOME" ? "/home/u" : undefined
		}));
		on("tool.register", (_$, e) => ({ value: { tool: e.name } }));
		on("fs.exists", () => ({ value: true }));
		on(
			"fs.read",
			() =>
				new Promise<never>(() => {
					// never answers
				})
		);

		// Act
		const started = $.session.start({
			cwd: "/home/u/p",
			surface: null,
			isInteractive: true
		});
		await clock.advance(5000);

		// Assert
		expect(await started).toMatchObject({ cwd: "/home/u/p" });
	});

	test("writes the construction over the user's style", async ($, on) => {
		// Arrange
		const { writes } = serve(on, '{"outputStyle": "Proactive"}');

		// Act
		await $.session.start({
			cwd: "/home/u/p",
			surface: null,
			isInteractive: true
		});

		// Assert
		expect(JSON.parse(writes.at(-1) ?? "{}")).toMatchObject({
			outputStyle: "claudetto:Claudetto"
		});
	});

	test("takes back a recorded key the construction no longer names while it holds the written value", async ($, on) => {
		// Arrange
		const { writes } = serve(on, '{"env": {"RETIRED_SWITCH": "1"}}', {
			"setup.filled": "older",
			"setup.owned": [{ path: ["env", "RETIRED_SWITCH"], value: "1" }]
		});

		// Act
		await $.session.start({
			cwd: "/home/u/p",
			surface: null,
			isInteractive: true
		});

		// Assert
		const written: unknown = JSON.parse(writes.at(-1) ?? "{}");
		expect(fieldOf(written, "env")).not.toHaveProperty("RETIRED_SWITCH");
	});

	test("does not fill again on the next start, so a user's edit holds", async ($, on) => {
		// Arrange
		const { writes, edit } = serve(on, "{}");
		const start = () =>
			$.session.start({ cwd: "/home/u/p", surface: null, isInteractive: true });
		await start();
		edit('{"outputStyle": "Proactive"}');

		// Act
		await start();

		// Assert
		expect(JSON.parse(writes.at(-1) ?? "{}")).toMatchObject({
			outputStyle: "Proactive"
		});
	});

	test("unloads the builtins it turned off by running /reload-plugins in an interactive session", async ($, on) => {
		// Arrange
		const { commands, logs } = serve(on, "{}");

		// Act
		await $.session.start({
			cwd: "/home/u/p",
			surface: null,
			isInteractive: true
		});

		// Assert
		expect(commands).toEqual(["reload-plugins"]);
		expect(logs.join("\n")).not.toContain("Run /reload-plugins");
	});

	test("runs no reload in a print session, which refuses it", async ($, on) => {
		// Arrange
		const { commands, logs } = serve(on, "{}");

		// Act
		await $.session.start({
			cwd: "/home/u/p",
			surface: null,
			isInteractive: false
		});

		// Assert
		expect(commands).toEqual([]);
		expect(logs.join("\n")).toContain("stay loaded until the next start");
	});

	test("sets the user's status line to the plugin script when there is none", async ($, on) => {
		// Arrange
		const { writes } = serve(on, "{}");

		// Act
		await $.session.start({
			cwd: "/home/u/p",
			surface: null,
			isInteractive: true
		});

		// Assert
		const written: unknown = JSON.parse(writes.at(-1) ?? "{}");
		expect(fieldOf(fieldOf(written, "statusLine"), "command")).toContain(
			"claudetto-statusline"
		);
	});

	test("keeps a status line the user wrote", async ($, on) => {
		// Arrange
		const { writes } = serve(
			on,
			'{"statusLine": {"type": "command", "command": "my-line"}}'
		);

		// Act
		await $.session.start({
			cwd: "/home/u/p",
			surface: null,
			isInteractive: true
		});

		// Assert
		const written: unknown = JSON.parse(writes.at(-1) ?? "{}");
		expect(fieldOf(fieldOf(written, "statusLine"), "command")).toBe("my-line");
	});

	test("moves claudetto's own status line command to the installed plugin and keeps its padding", async ($, on) => {
		// Arrange
		const own = {
			statusLine: {
				type: "command",
				command: 'bun --no-env-file "/old/bin/claudetto-statusline"',
				padding: 2
			}
		};
		const { writes } = serve(on, JSON.stringify(own));

		// Act
		await $.session.start({
			cwd: "/home/u/p",
			surface: null,
			isInteractive: true
		});

		// Assert
		const line = fieldOf(JSON.parse(writes.at(-1) ?? "{}"), "statusLine");
		expect(fieldOf(line, "command")).toContain("claudetto-statusline");
		expect(fieldOf(line, "command")).not.toContain("/old/");
		expect(fieldOf(line, "padding")).toBe(2);
	});

	test("leaves the status line alone on the next start once it names the installed plugin", async ($, on) => {
		// Arrange
		const { writes } = serve(on, "{}");
		const start = () =>
			$.session.start({ cwd: "/home/u/p", surface: null, isInteractive: true });
		await start();
		const first = writes.length;

		// Act
		await start();

		// Assert
		expect(writes.slice(first)).toEqual([]);
	});

	test("a status line the user removed after claudetto set it stays removed on later starts", async ($, on) => {
		// Arrange
		const { writes, edit } = serve(on, "{}");
		const start = () =>
			$.session.start({ cwd: "/home/u/p", surface: null, isInteractive: true });
		await start();
		edit("{}\n");
		const removed = writes.length;

		// Act
		await start();

		// Assert
		expect(
			writes.slice(removed).some((text) => text.includes("statusLine"))
		).toBe(false);
	});
});
