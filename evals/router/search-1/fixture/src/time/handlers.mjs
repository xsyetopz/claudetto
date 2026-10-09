import { parseClock } from "./clock.mjs";
import { parseDuration } from "./strict.mjs";

// The table stores the functions. `../cli/dispatch.mjs` calls them.
export const HANDLERS = { dur: parseDuration, clock: parseClock };
