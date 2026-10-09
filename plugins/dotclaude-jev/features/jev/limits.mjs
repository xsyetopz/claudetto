// The bounds of the Jev feature.

/** Under this confidence, the TypeSafe docs treat an answer as uncertain. */
export const MIN_CONFIDENCE = 0.5;

/** How long the Jev client may run before the call stops. */
export const JEV_TIMEOUT_MS = 45000;

/** The client script, relative to the plugin root. */
export const CLIENT = "features/jev/cli.mjs";
