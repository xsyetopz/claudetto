import path from "node:path";
import {
	LAST_KEY,
	ROWS_KEY,
	readingOf,
	rowsOf,
	type WindowRow,
} from "../plugins/claudetto/src/blocks/window/window.ts";
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
