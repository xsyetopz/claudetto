import { type Engine, expect, test } from "claude-code/testing";
import { STATUSLINE } from "../src/blocks/status-line/block.ts";

const run = ($: Engine, args: string) =>
	$.command.run({
		command: STATUSLINE,
		args,
		origin: { kind: "composer" },
		presentation: { isFullscreen: false, columns: 80 },
	});

test("the built-in `/statusline` is answered with text and no context", async ($: Engine) => {
	const out = await run($, "");

	expect(out.text).toBeDefined();
	expect(out.context).toBeUndefined();
});
