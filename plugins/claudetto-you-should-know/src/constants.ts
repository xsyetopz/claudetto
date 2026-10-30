export const BORROWED = {
	CHECK_EVERY: 6,
	CLEAR_AFTER_PROMPTS: 2,
	TYPED_PAST_FREE: 2,
	/** In checks skipped. */
	LOOKS_TO_SKIP_MAX: 16,
	/** In ms: how long a dismissed offer waits for an answer. */
	ASKED_MS: 20_000,
	SEEN_MAX: 50,
	SESSIONS_MAX: 32,
	/** In ms: how long an open row survives eviction. */
	SHOWN_KEEP_MS: 259_200_000,
	/** In characters. */
	MAX_LINE_WIDTH: 240,
	/** In characters. */
	MAX_TITLE_WIDTH: 120,
	/** In characters. */
	MAX_CAPTION_LENGTH: 4000,
	MAX_CARDS: 4,
	MAX_SKETCH_LINES: 12,
	/** In characters. */
	MAX_SKETCH_WIDTH: 120,
	/** In cells. */
	CHOICE_GAP: 3,
	OFFER_MARGIN_ROWS: 1,
	/** In cells. */
	STAR_CELLS: 2,
	DEFAULT_TAG: "You should know",
} as const;

/** The original's `$.model.fork` carries no model, effort, or bound, so these are bounds we set. */
export const OWN = {
	/** In tokens. */
	MAX_TOKENS: 512,
	/** In characters. */
	MAX_DIGEST_CHARS: 8000,
	DIGEST_TURNS: 8,
} as const;
