import type { EngineInterface, On, PluginOptions } from "claude-code";

import {
	type CallAnswer,
	type CallEvent,
	type CallNext,
	chain,
	type CheckAnswer,
	type CheckEvent,
	type CheckNext,
} from "./chain.ts";
import { boundOutputCall } from "./limits/bound-output.ts";
import {
	holdCheck,
	holdHooks,
	type HoldState,
	holdState,
} from "./limits/hold.ts";
import { lineFileHooks } from "./limits/line-file.ts";
import { memoryGuard } from "./limits/memory.ts";
import {
	priceStepCall,
	priceStepHooks,
	type PriceStepState,
	priceStepState,
} from "./limits/price-step.ts";
import { budgetHooks, stopHooks, subagentStopHooks } from "./limits/stop.ts";
import {
	stopCall,
	stopCheck,
	type StopState,
	stopState,
} from "./limits/turn.ts";

/** What the limits' guards and hooks share. */
export interface LimitsState {
	readonly price: PriceStepState;
	readonly hold: HoldState;
	readonly stop: StopState;
}

/** Makes the state of one session's limits. */
export const limitsState = (options: PluginOptions): LimitsState => ({
	price: priceStepState(),
	hold: holdState(options),
	stop: stopState(),
});

/** Registered first, so the price step bounds what every later hook adds. */
export const limits = (
	on: On,
	options: PluginOptions,
	state: LimitsState,
): void => {
	priceStepHooks(on, state.price);
	holdHooks(on, state.hold);
	stopHooks(on, options, state.stop);
	subagentStopHooks(on);
	budgetHooks(on);
	lineFileHooks(on);
};

/** The check guards of the limits, in wrap order. */
export function limitsCheck(
	$: EngineInterface,
	e: CheckEvent,
	next: CheckNext,
	state: LimitsState,
): CheckAnswer {
	return chain(e, next, [
		(at, step) => memoryGuard($, at, step, state.hold.memory),
		(at, step) => holdCheck($, at, step, state.hold),
		(at, step) => stopCheck(at, step, state.stop),
	]);
}

/** The call guards of the limits, in wrap order. */
export function limitsCall(
	$: EngineInterface,
	e: CallEvent,
	next: CallNext,
	state: LimitsState,
	options: PluginOptions,
): CallAnswer {
	return chain(e, next, [
		(at, step) => priceStepCall($, at, step, state.price),
		(at, step) => stopCall(at, step, state.stop),
		(at, step) => boundOutputCall($, at, step, options),
	]);
}
