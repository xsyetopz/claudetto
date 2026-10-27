// The bounds of the `agent-browser` guide in the `browse` skill.

/**
 * The most characters of the guide in the skill.
 * The guide of `agent-browser` 0.x has about 38,000 characters, and each character stays in the context of the session.
 */
export const MAX_GUIDE_CHARS = 40_000;

/** How long `agent-browser skills get core` may take. */
export const GUIDE_TIMEOUT_MS = 15_000;
