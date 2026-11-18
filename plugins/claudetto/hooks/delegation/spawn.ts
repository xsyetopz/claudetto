import type { On } from "claude-code";

/** Fable, Mythos and Opus, by alias or full id (`claude-opus-5-5`, `claude-fable-5-2`). */
const BARRED = /fable|mythos|opus/iu;

/**
 * Refuses a subagent spawn that names Fable, Mythos or Opus (REQ-DELEGATION-026).
 * The stock Agent tool's `model` enum offers `opus` and `fable`, so the lead can
 * pick either; subagents run on Sonnet or Haiku.
 */
export function registerSpawn(on: On): void {
	on("agent.spawn", (_$, e, next) => {
		if (e.model !== undefined && BARRED.test(e.model)) {
			return { deny: `Subagents run on Sonnet or Haiku, because a delegated slice does not need ${e.model} and its cost. Re-call the Agent tool with model "sonnet" or "haiku", or leave model unset.` };
		}
		return next(e);
	}).catch((_$, e, next) => next(e));
}
