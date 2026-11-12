import type { EngineInterface, On, PluginOptions } from "claude-code";

import { askFixCall } from "./ask-fix.ts";
import {
	type CallAnswer,
	type CallEvent,
	type CallNext,
	chain,
	type CheckAnswer,
	type CheckEvent,
	checkFault,
	type CheckNext,
} from "./chain.ts";
import { decideCall, typesafeKey } from "./decide.ts";
import { delegation, delegationCall } from "./delegation.ts";
import { gate, gateState } from "./gate.ts";
import { gateCall, gateCheck } from "./gate/watch.ts";
import { hygiene } from "./hygiene.ts";
import { budgetRunCall } from "./limits/budget-run.ts";
import { holdCheck, holdHooks, holdState } from "./limits/hold.ts";
import { lineFileHooks } from "./limits/line-file.ts";
import { memoryGuard, memoryWatchCall } from "./limits/memory.ts";
import {
	priceStepCall,
	priceStepHooks,
	priceStepState,
} from "./limits/price-step.ts";
import { budgetHooks, stopHooks, subagentStopHooks } from "./limits/stop.ts";
import { stopCall, stopCheck, stopState } from "./limits/turn.ts";
import { notify } from "./notify.ts";
import { pin, pinCall, pinCheck, pinState } from "./pin.ts";
import { reply } from "./reply.ts";
import { sandboxGitCall, sandboxGitState } from "./sandbox-git.ts";
import { setup } from "./setup.ts";
import { slices, slicesCall, slicesState } from "./slices.ts";
import { surface, surfaceCall } from "./surface.ts";
import { DECIDE_SPEC } from "./texts-gate.ts";
import { REPLY_SPEC } from "./texts.ts";

const stateOf = (options: PluginOptions) => ({
	written: slicesState(),
	price: priceStepState(),
	hold: holdState(options),
	stop: stopState(),
	pinned: pinState(),
	gate: gateState(options),
	sandboxGit: sandboxGitState(),
});

type State = ReturnType<typeof stateOf>;

// `slices` is outermost, so it asks for a commit only after every other Stop check passed; the price step comes next, so it bounds what every later hook adds.
const registerOuter = (on: On, options: PluginOptions, state: State): void => {
	slices(on, state.written);
	priceStepHooks(on, state.price);
	holdHooks(on, state.hold);
	stopHooks(on, options, state.stop);
	subagentStopHooks(on);
	budgetHooks(on);
	lineFileHooks(on);
	setup(on, options);
	surface(on, options);
	pin(on, state.pinned);
	delegation(on);
};

const registerInner = (on: On, options: PluginOptions, state: State): void => {
	hygiene(on, options);
	notify(on, options);
	gate(on, state.gate);
	reply(on);
};

const checkGuards = (
	$: EngineInterface,
	e: CheckEvent,
	next: CheckNext,
	state: State,
): CheckAnswer =>
	chain(e, next, [
		(at, step) => memoryGuard($, at, step, state.hold.memory),
		(at, step) => holdCheck($, at, step, state.hold),
		(at, step) => stopCheck(at, step, state.stop),
		(at, step) => pinCheck(at, step, state.pinned),
		(at, step) => gateCheck($, at, step, state.gate),
	]);

const callGuards = (
	$: EngineInterface,
	e: CallEvent,
	next: CallNext,
	state: State,
	options: PluginOptions,
): CallAnswer =>
	chain(e, next, [
		(at, step) => slicesCall($, at, step, state.written),
		(at, step) => priceStepCall($, at, step, state.price),
		(at, step) => stopCall(at, step, state.stop),
		(at, step) => memoryWatchCall($, at, step, state.hold.memoryProcessMax),
		(at, step) => budgetRunCall($, at, step),
		(at, step) => surfaceCall(at, step, options),
		(at, step) => pinCall(at, step, state.pinned),
		(at, step) => askFixCall($, at, step),
		(at, step) => delegationCall(at, step),
		(at, step) => decideCall($, at, step),
		(at, step) => sandboxGitCall($, at, step, state.sandboxGit),
		(at, step) => gateCall($, at, step, state.gate),
	]);

const registerGuards = (on: On, options: PluginOptions, state: State): void => {
	on("tool.check", ($, e, next) => checkGuards($, e, next, state)).catch(
		(_error, _e, next) => ({ decision: "ask", reason: checkFault(next) }),
	);
	on("tool.call", ($, e, next) => callGuards($, e, next, state, options)).catch(
		async (_error, e, next) => {
			if (next.called) {
				await next(e);
			}
			return { deny: next.error.message ?? next.error.kind };
		},
	);
};

// The engine takes one unmatched `session.start` per module, and `classic.SessionStart` under `-p` has no session to register a tool on.
const registerTools = (on: On): void => {
	on("session.start", async ($, e, next) => {
		const out = await next(e);
		await $.command.register(REPLY_SPEC);
		if ((await typesafeKey($)) !== "") {
			await $.tool.register(DECIDE_SPEC);
		}
		return out;
	});
};

// Registration order is wrap order.
export const register = (on: On, options: PluginOptions): void => {
	const state = stateOf(options);
	registerOuter(on, options, state);
	registerGuards(on, options, state);
	registerInner(on, options, state);
	registerTools(on);
};
