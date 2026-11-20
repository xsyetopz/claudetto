/** Fixed limits, keys, and plain strings of the you-should-know plugin. */

/** The first check comes early, because notes that wait for step 6 arrive after the work they concern (ADR-0190). */
export const FIRST_CHECK = 3;
export const CHECK_EVERY = 6;
export const CLEAR_AFTER_PROMPTS = 2;
export const CHECKS_KEPT = 3;
export const SEEN_MAX = 50;
export const SESSIONS_MAX = 32;
export const SHOWN_KEEP_MS = 259_200_000;
export const ASKED_MS = 20_000;
export const NOTE_READ_MS = 2000;
export const TYPED_PAST_FREE = 2;
export const LOOKS_TO_SKIP_MAX = 16;

export const MAX_LINE_WIDTH = 240;
export const MAX_CAPTION_LENGTH = 4000;
export const MAX_CARDS = 4;
export const MAX_SKETCH_LINES = 12;
export const MAX_SKETCH_WIDTH = 120;
export const MAX_TITLE_WIDTH = 120;
export const SLUG_MAX = 48;
export const CLOCK_LENGTH = 8;

export const CARD_WIDTH = 60;
export const CARD_INSET = 2;
export const STAR_CELLS = 2;
export const FALLBACK_COLUMNS = 80;
export const OFFER_MARGIN_ROWS = 1;
export const MS_PER_SECOND = 1000;

export const DEFAULT_TAG = "You should know";

/** The plugin's own name in `$.state` addresses. */
export const STATE_PLUGIN = "claudetto-you-should-know";

export const OFFER_LABELS = {
	explain: "Learn more",
	knew: "Knew this already",
	about: "What is this",
	off: "Disable",
	later: "Dismiss"
} as const;

/** The plugin's own name, shown in the disable hint and matched in typed off commands. */
export const PLUGIN_NAME = "claudetto-you-should-know";
/** Names the bundled plugin went by; a typed disable of any of them still ends the off line. */
export const EARLIER_NAMES: readonly string[] = [
	"cc-plugin-you-should-know",
	"suggest-learning",
	"you-should-know"
];
export const OFF_COMMAND = `/plugin disable ${PLUGIN_NAME}`;
