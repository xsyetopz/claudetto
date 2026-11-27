import { describe, expect, test } from "claude-code/testing";

import { serve } from "./serve";

describe("setup command", () => {
	test("SETUP-075 /claudetto-setup puts back the removed status line and the construction over a user's edit", async ($, on) => {
		// Arrange
		const { writes, edit } = serve(on, "{}");
		on("fs.list", () => ({ value: [] }));
		await $.session.start({
			cwd: "/home/u/p",
			surface: null,
			isInteractive: true
		});
		edit('{"outputStyle": "Proactive"}');

		// Act
		const out = await $.command.run({
			command: "claudetto-setup",
			args: "",
			origin: { kind: "composer" },
			presentation: { isFullscreen: false, columns: 80 }
		});

		// Assert
		expect(JSON.parse(writes.at(-1) ?? "{}")).toMatchObject({
			outputStyle: "claudetto:Claudetto",
			statusLine: { type: "command" }
		});
		expect(out).toMatchObject({
			text: "Applied claudetto's settings and status line to `/home/u/.claude/settings.json`; the rules are current."
		});
	});
});
