// Every number and fixed string the rebuilt observer runs on, in one place, so that a check can hold
// each one against the source note. `BORROWED` holds the values read out of the original, which the
// `builtin-rebuild` spec allows to be reused, and `OWN` holds the values the original has no
// counterpart for. Each one is quoted with its line in
// `docs/keep/plugins/you-should-know-source-2.1.310.txt`, and
// `tests/repo/rebuild-constants.test.ts` fails when a value here is not in that note.

/**
 * Read out of the original. The line beside each name is a line of
 * `docs/keep/plugins/you-should-know-design.txt`, which is the constant-by-constant reading of the
 * module, and the source note repeats them with the same numbers.
 */
export const BORROWED = {
	/** Steps between checks, `CHECK_EVERY` (design line 1306). */
	CHECK_EVERY: 6,
	/** Prompts typed past an offer before it clears, `CLEAR_AFTER_PROMPTS` (1307). */
	CLEAR_AFTER_PROMPTS: 2,
	/** Ignored offers that cost nothing before the back-off starts, `TYPED_PAST_FREE` (3258). */
	TYPED_PAST_FREE: 2,
	/** The ceiling of the back-off, in checks skipped, `LOOKS_TO_SKIP_MAX` (3257). */
	LOOKS_TO_SKIP_MAX: 16,
	/** How long a dismissed offer waits for an answer, in ms, `ASKED_MS` (1548). */
	ASKED_MS: 20_000,
	/** Lines kept in each of the shown list and the known list, `SEEN_MAX` (1466). */
	SEEN_MAX: 50,
	/** Session rows kept at once, `SESSIONS_MAX` (2363). */
	SESSIONS_MAX: 32,
	/** How long an open row survives eviction, in ms, `SHOWN_KEEP_MS` (2364). */
	SHOWN_KEEP_MS: 259_200_000,
	/** The longest offer line, in characters, `MAX_LINE_WIDTH` (1344). */
	MAX_LINE_WIDTH: 240,
	/** The longest card title, in characters, `MAX_TITLE_WIDTH` (1312). */
	MAX_TITLE_WIDTH: 120,
	/** The longest card body, in characters, `MAX_CAPTION_LENGTH` (1308). */
	MAX_CAPTION_LENGTH: 4000,
	/** Cards an explanation may hold, `MAX_CARDS` (1309). */
	MAX_CARDS: 4,
	/** Lines a drawing inside a card may hold, `MAX_SKETCH_LINES` (1310). */
	MAX_SKETCH_LINES: 12,
	/** The widest line of such a drawing, in characters, `MAX_SKETCH_WIDTH` (1311). */
	MAX_SKETCH_WIDTH: 120,
	/** Cells between two keys of the bar, `CHOICE_GAP` (785). */
	CHOICE_GAP: 3,
	/** Blank rows above the offer, `OFFER_MARGIN_ROWS` (825). */
	OFFER_MARGIN_ROWS: 1,
	/** Cells the marker column takes, `STAR_CELLS` (826). */
	STAR_CELLS: 2,
	/** The tag an offer carries when the reply names none, `DEFAULT_TAG` (1395). */
	DEFAULT_TAG: "You should know",
} as const;

/**
 * The rebuild's own, because the original has no counterpart. The original calls `$.model.fork`,
 * which carries no model, no effort, and no bound, so every value below is a bound this plugin sets
 * and not one it read. The source note records each with the reason, under its own heading.
 */
export const OWN = {
	/** The longest reply one check may bill, in tokens. */
	MAX_TOKENS: 512,
	/** The longest digest the plugin builds for one check, in characters. */
	MAX_DIGEST_CHARS: 8000,
	/** Turns of the session the digest may draw on. */
	DIGEST_TURNS: 8,
} as const;
