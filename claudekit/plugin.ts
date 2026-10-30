// The toolkit's one seam onto the plugin. No other file under `claudekit/` names a `plugins/` path; each
// takes what it needs from here (`tests/repo/seam.test.ts` holds that).
//
// The three modules behind it are plugin internals with no public API: the plugin exports them to nobody.
// That is why the toolkit is a folder of this repo and not a package. A package could not resolve the
// sibling `plugins/claudetto` directory, and publishing these modules would make `HANDOFF_TRIGGER_TOKENS`
// a public contract while the change is still asking whether that value is right
// (`openspec/changes/claudetto-restart/decisions.md`, "`ClaudeKit` Is a Folder of This Repo, Not a Package").
//
// The values are re-exported, never copied, so a change to the shipped threshold reaches the probe.

import path from "node:path";

import {
	CONTEXT_WINDOW,
	compactAt,
	HAIKU_HANDOFF_TRIGGER_TOKENS,
	HANDOFF_TRIGGER_TOKENS,
	pctFor,
} from "../plugins/claudetto/src/threshold.ts";
import {
	HAIKU_MODEL,
	HAIKU_PRICE_STEP,
} from "../plugins/claudetto/src/tiers/tiers.ts";
import {
	LAST_KEY,
	ROWS_KEY,
	readingOf,
	rowsOf,
	type WindowRow,
} from "../plugins/claudetto/src/window/window.ts";

// Each name is the plugin's own binding, passed on and not copied. The imports come first because
// `export ... from` is a barrel to the linter, and this file is the one place that reads the plugin.
export {
	CONTEXT_WINDOW,
	compactAt,
	HAIKU_HANDOFF_TRIGGER_TOKENS,
	HAIKU_MODEL,
	HAIKU_PRICE_STEP,
	HANDOFF_TRIGGER_TOKENS,
	LAST_KEY,
	pctFor,
	ROWS_KEY,
	readingOf,
	rowsOf,
	type WindowRow,
};

/** An absolute path, because each run starts in a temp folder. */
export const PLUGIN_DIR = path.join(import.meta.dir, "../plugins/claudetto");
