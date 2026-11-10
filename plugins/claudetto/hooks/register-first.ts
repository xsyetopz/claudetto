import type { On, PluginOptions } from "claude-code";

import { delegation } from "./delegation.ts";
import { limits } from "./limits.ts";
import { pin } from "./pin.ts";
import { runs } from "./runs.ts";
import { setup } from "./setup.ts";
import { slices } from "./slices.ts";
import { surface } from "./surface.ts";

/** The first registrations in wrap order: `slices` is outermost, so it asks for a commit only after every other Stop check passed; `limits` bounds what every later hook adds. */
export const registerFirst = (on: On, options: PluginOptions): void => {
	slices(on);
	limits(on, options);
	setup(on, options);
	surface(on, options);
	pin(on);
	delegation(on);
	runs(on);
};
