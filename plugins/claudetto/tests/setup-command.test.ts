// `/claudetto:setup` is answered in code, so the person reads the report and the model reads
// nothing: the result carries `text` and no `context`, which is what makes the command cost the
// session no tokens. These runs drive the real registration through the engine's own `$.command.run`.
//
// This environment has no person to ask, so `$.ui.ask` rejects and the command keeps nothing, which
// is the same path a `claude -p` run takes. Which groups a kept answer writes is decided by pure
// functions, and `tests/claudetto/tier/hooks.test.ts` covers those.
//
// Nothing beneath the plugins answers `env.get` here, so each test answers it: the command reads
// `CLAUDE_CONFIG_DIR` and `HOME` to find the settings file.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { SETUP_COMMAND } from "../src/tiers/hooks.ts";

/** Answers the two names the command reads: no `CLAUDE_CONFIG_DIR`, so the file is under `HOME`. */
const environment = (on: On): void => {
	on("env.get", (_$, e) => ({
		value: e.name === "HOME" ? "/home/u" : undefined,
	}));
};

/** The engine stamps `origin` and `presentation` on a real run; the test `$` is typed on the whole input, so they are given here as a headless main screen. */
const run = ($: Engine) =>
	$.command.run({
		command: SETUP_COMMAND,
		args: "",
		origin: { kind: "composer" },
		presentation: { isFullscreen: false, columns: 80 },
	});

test("the command is answered in code, so the model is left nothing to read", async ($: Engine, on: On) => {
	environment(on);

	const out = await run($);

	expect(out.context).toBeUndefined();
});

test("with nobody to ask, the command writes nothing and says so", async ($: Engine, on: On) => {
	environment(on);

	const out = await run($);

	expect(out.text ?? "").toContain("Nothing was chosen");
});
