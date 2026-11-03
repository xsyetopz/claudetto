// Helpers that the `classic.SessionStart` tests of one block share.

import type { On } from "claude-code";
import type { Engine } from "claude-code/testing";
import { storeStub } from "./setup-command/support.ts";

/** The other `classic.SessionStart` hooks of the plugin read these, and a missing stub skips the chain. */
export const sessionStartStubs = (on: On, root: string): void => {
	storeStub(on, new Map());
	on("ui.log", () => ({ value: undefined }));
	on("session.version", () => ({
		value: { version: "2.1.317", base: "2.1.317", builtAt: "" },
	}));
	on("session.id", () => ({ value: "s" }));
	on("session.root", () => ({ value: root }));
	on("classic.SessionStart", () => ({}));
};

export const sessionStart = (
	$: Engine,
	cwd: string,
	source: "startup" | "clear" | "compact" = "startup",
) => $.classic.SessionStart({ source, cwd });
