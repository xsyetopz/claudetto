import type { On } from "claude-code";

import { fault } from "../shared/fault";
import { concurrencyDeny } from "./limit";

/** Fable, Mythos and Opus, by alias or full id (`claude-opus-5-5`, `claude-fable-5-2`). */
const BARRED = /fable|mythos|opus/iu;

/**
 * Refuses a subagent spawn that names Fable, Mythos or Opus (REQ-DELEGATION-026).
 * The stock Agent tool's `model` enum offers `opus` and `fable`, so the lead can
 * pick either; subagents run on Sonnet or Haiku. It also refuses a spawn past
 * the concurrent subagent limit with a message that says to wait.
 */
export function registerSpawn(on: On): void {
	on("agent.spawn", async ($, e, next) => {
		if (e.model !== undefined && BARRED.test(e.model)) {
			return {
				deny: `Subagents run on Sonnet or Haiku, because a delegated slice does not need ${e.model} and its cost. Re-call the Agent tool with model "sonnet" or "haiku", or leave model unset.`
			};
		}
		const deny = await concurrencyDeny($);
		return deny === undefined ? next(e) : { deny };
	}).catch(($, e, next) => {
		fault($, "spawn model check", next.error);
		return next(e);
	});
}
