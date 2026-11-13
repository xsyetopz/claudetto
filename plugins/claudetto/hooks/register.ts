import type { EngineInterface, On, PluginOptions } from "claude-code";

import { agentFileModel } from "./agent.spawn/useAgentFileModel/model";
import {
	holdCheck,
	holdHooks,
	holdState,
	memoryGuard,
	memoryWatchCall,
} from "./agent.spawn/useMemoryHold/hold";
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
import { advisor } from "./command.run/useAdvisorCommand/advisor";
import { reply } from "./command.run/useReplyCommand/reply";
import { setup } from "./command.run/useSetup/setup";
import { modelPrompt } from "./prompt.compose/useModelPrompt/compose";
import { sessionTempCleanup } from "./session.end/useSessionTempCleanup/cleanup";
import { lineFileHooks } from "./session.measure/useLineFile/line-file";
import { surface } from "./settings.read/useSlimSurface/surface";
import { ADVISOR_COMMAND_SPEC, REPLY_SPEC } from "./texts";
import { ADVISOR_SPEC, DECIDE_SPEC } from "./texts-gate";
import { advisorCall } from "./tool.call/useAdvisorTool/advisor";
import {
	budgetHooks,
	budgetRunCall,
} from "./tool.call/useBudgetRun/budget-run";
import { delegation } from "./tool.call/useClaudettoAgents/delegation";
import { decideCall, typesafeKey } from "./tool.call/useDecideTool/decide";
import {
	sandboxGitCall,
	sandboxGitState,
} from "./tool.call/useSandboxGit/sandbox-git";
import { secretCall } from "./tool.call/useSecretScan/scan";
import {
	priceStepCall,
	priceStepHooks,
	priceStepState,
} from "./turn.step/usePriceStep/price-step";

const stateOf = (options: PluginOptions) => ({
	price: priceStepState(),
	hold: holdState(options),
	sandboxGit: sandboxGitState(),
});

type State = ReturnType<typeof stateOf>;

// The price step is outermost, so it bounds what every later hook adds.
const registerOuter = (on: On, options: PluginOptions, state: State): void => {
	priceStepHooks(on, state.price);
	holdHooks(on, state.hold);
	agentFileModel(on);
	modelPrompt(on);
	budgetHooks(on);
	lineFileHooks(on);
	setup(on, options);
	surface(on);
	delegation(on);
};

const registerInner = (on: On, options: PluginOptions): void => {
	hygiene(on, options);
	sessionTempCleanup(on, options);
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
	]);

const callGuards = (
	$: EngineInterface,
	e: CallEvent,
	next: CallNext,
	state: State,
): CallAnswer =>
	chain(e, next, [
		(at, step) => priceStepCall($, at, step, state.price),
		(at, step) => memoryWatchCall($, at, step, state.hold.memoryProcessMax),
		(at, step) => budgetRunCall($, at, step),
		(at, step) => advisorCall($, at, step),
		(at, step) => decideCall($, at, step),
		(at, step) => sandboxGitCall($, at, step, state.sandboxGit),
		(at, step) => secretCall($, at, step),
	]);

const registerGuards = (on: On, state: State): void => {
	on("tool.check", ($, e, next) => checkGuards($, e, next, state));
	on("tool.call", ($, e, next) => callGuards($, e, next, state)).catch(
		(_error, e, next) =>
			next.called ? next(e) : { deny: next.error.message ?? next.error.kind },
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
	registerGuards(on, state);
	registerInner(on, options);
	registerTools(on);
};
