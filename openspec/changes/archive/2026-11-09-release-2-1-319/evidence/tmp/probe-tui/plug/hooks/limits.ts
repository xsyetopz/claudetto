import type { On, PluginOptions } from "claude-code";

import { boundOutputHooks } from "./limits/bound-output.ts";
import { holdHooks } from "./limits/hold.ts";
import { priceStepHooks } from "./limits/price-step.ts";
import { budgetHooks, stopHooks } from "./limits/stop.ts";

/** Registered first, so the price step bounds what every later hook adds. */
export const limits = (on: On, options: PluginOptions): void => {
	priceStepHooks(on);
	holdHooks(on, options);
	stopHooks(on, options);
	budgetHooks(on);
	boundOutputHooks(on, options);
};
