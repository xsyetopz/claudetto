import type { On, PluginOptions } from "claude-code";

import { decide } from "./decide.ts";
import { gate } from "./gate.ts";
import { handoff } from "./handoff.ts";
import { hygiene } from "./hygiene.ts";
import { notify } from "./notify.ts";
import { reply } from "./reply.ts";
import { wordingTests } from "./wording-tests.ts";

/** The registrations that wrap inside those of `registerFirst`, in wrap order. */
export const registerLast = (on: On, options: PluginOptions): void => {
	decide(on, options);
	handoff(on, options);
	hygiene(on, options);
	notify(on, options);
	gate(on, options);
	wordingTests(on);
	reply(on);
};
