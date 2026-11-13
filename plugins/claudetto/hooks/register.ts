import type { EngineInterface, On, PluginOptions } from "claude-code";

import {
	holdCheck,
	holdHooks,
	holdState,
} from "./agent.spawn/useMemoryHold/hold";
import {
	memoryGuard,
	memoryWatchCall,
} from "./agent.spawn/useMemoryHold/memory";
import {
	type CallAnswer,
	type CallEvent,
	type CallNext,
	chain,
	type CheckAnswer,
	type CheckEvent,
	type CheckNext,
} from "./chain";
import { hygiene } from "./classic.SessionStart/useHygieneSweep/hygiene";
import {
	slices,
	slicesCall,
	slicesState,
} from "./classic.Stop/useSliceCommits/slices";
import {
	budgetHooks,
	stopHooks,
	subagentStopHooks,
} from "./classic.Stop/useStopChecks/stop";
import {
	stopCall,
	stopCheck,
	stopState,
} from "./classic.Stop/useStopChecks/turn";
import { notify } from "./classic.StopFailure/useStopNotice/notify";
import { advisor } from "./command.run/useAdvisorCommand/advisor";
import { reply } from "./command.run/useReplyCommand/reply";
import { setup } from "./command.run/useSetup/setup";
import {
	pin,
	pinCall,
	pinCheck,
	pinState,
} from "./prompt.submit/useConstraintPin/pin";
import { lineFileHooks } from "./session.measure/useLineFile/line-file";
import { surface, surfaceCall } from "./settings.read/useSlimSurface/surface";
import { ADVISOR_COMMAND_SPEC, REPLY_SPEC } from "./texts";
import { ADVISOR_SPEC, DECIDE_SPEC } from "./texts-gate";
import { advisorCall } from "./tool.call/useAdvisorTool/advisor";
import { askFixCall } from "./tool.call/useAskFix/ask-fix";
import { budgetRunCall } from "./tool.call/useBudgetRun/budget-run";
import {
	delegation,
	delegationCall,
} from "./tool.call/useClaudettoAgents/delegation";
import { decideCall, typesafeKey } from "./tool.call/useDecideTool/decide";
import {
	sandboxGitCall,
	sandboxGitState,
} from "./tool.call/useSandboxGit/sandbox-git";
import { gate, gateState } from "./tool.check/useBashRules/gate";
import { gateCall, gateCheck } from "./tool.check/useBashRules/watch";
import {
	priceStepCall,
	priceStepHooks,
	priceStepState,
} from "./turn.step/usePriceStep/price-step";

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
	advisor(on);
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
		(at, step) => advisorCall($, at, step),
		(at, step) => decideCall($, at, step),
		(at, step) => sandboxGitCall($, at, step, state.sandboxGit),
		(at, step) => gateCall($, at, step, state.gate),
	]);

const registerGuards = (on: On, options: PluginOptions, state: State): void => {
	on("tool.check", ($, e, next) => checkGuards($, e, next, state));
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
		await $.command.register(ADVISOR_COMMAND_SPEC);
		await $.tool.register(ADVISOR_SPEC);
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
