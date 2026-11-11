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
import { decideCall } from "./decide.ts";
import { gate, gateState } from "./gate.ts";
import { gateCall, gateCheck, type GateState } from "./gate/watch.ts";
import {
	handoff,
	handoffCall,
	type HandoffState,
	handoffState,
} from "./handoff.ts";
import { hygiene } from "./hygiene.ts";
import { notify } from "./notify.ts";
import { reply } from "./reply.ts";
import { wordingTestsCheck } from "./wording-tests.ts";

/** What the guards and hooks registered last share. */
export interface LastState {
	readonly gate: GateState;
	readonly handoff: HandoffState;
}

/** Makes the state of one session's last registrations. */
export const lastState = (options: PluginOptions): LastState => ({
	gate: gateState(options),
	handoff: handoffState(),
});

/** The registrations that wrap inside those of `registerFirst`, in wrap order. */
export const registerLast = (
	on: On,
	options: PluginOptions,
	state: LastState,
): void => {
	handoff(on, options, state.handoff);
	hygiene(on, options);
	notify(on, options);
	gate(on, state.gate);
	reply(on);
};

/** The check guards that wrap inside those of `registerFirst`, in wrap order. */
export function lastCheck(
	$: EngineInterface,
	e: CheckEvent,
	next: CheckNext,
	state: LastState,
): CheckAnswer {
	return chain(e, next, [
		(at, step) => wordingTestsCheck($, at, step),
		(at, step) => gateCheck($, at, step, state.gate),
	]);
}

/** The call guards that wrap inside those of `registerFirst`, in wrap order. */
export function lastCall(
	$: EngineInterface,
	e: CallEvent,
	next: CallNext,
	state: LastState,
	options: PluginOptions,
): CallAnswer {
	return chain(e, next, [
		(at, step) => decideCall($, at, step, options),
		(at, step) => handoffCall($, at, step, state.handoff),
		(at, step) => gateCall($, at, step, state.gate),
	]);
}
