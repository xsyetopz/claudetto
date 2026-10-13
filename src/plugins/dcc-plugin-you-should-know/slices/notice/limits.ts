// The bounds of the `notice` slice: the size of the model call and of its prompt, and how long the tool waits for it.

/** The model of the separate call. An alias, so that the engine resolves the current Haiku. */
export const COMPLETE_MODEL = "haiku";

/** The most output tokens of one answer. A topic is one sentence. */
export const MAX_REPLY_TOKENS = 120;

/**
 * How long the separate call may take.
 * The probe measured about 1 second for a short prompt, and the tool waits for the call.
 */
export const COMPLETE_TIMEOUT_MS = 5000;

/** How long the tool waits for a fork. The probe measured about 1 second, and a hook has 10 seconds. */
export const FORK_WAIT_MS = 6000;

/** The most characters of the prompt of the user and of the pending action in one call. */
export const MAX_INPUT_CHARS = 4000;

/**
 * The most topics of the `<seen>` list in one prompt, the newest first to drop.
 * Ten topics of 400 characters at most is 4000 characters, the same as `MAX_INPUT_CHARS`.
 * The repeat check still reads every topic of the session.
 */
export const MAX_SEEN_TOPICS = 10;

/** The most characters of a topic in the toast. */
export const MAX_TOPIC_CHARS = 400;

/** How long a toast stays, so that the user can read one sentence. */
export const TOAST_MS = 12000;
