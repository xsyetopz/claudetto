import type { HookFor } from "claude-code";
import { atRoot } from "../handoff/root.ts";
import { heartbeatPath } from "../heartbeat/path.ts";
import { boundOf } from "./bound.ts";
import { WITHHELD } from "./prompts.ts";
import { newStep, takeStep, waitFor } from "./steps.ts";

/** The engine runs a tool while its step still streams, so a call can finish before the stop chunk; each call waits on its own step's chunk. It also writes the heartbeat, since the hook loader takes one `turn.step` hook without a matcher. */
export const onStep: HookFor<"turn.step"> = async function* ($, e, next) {
	const beat = async (): Promise<void> => {
		try {
			const [session, root, now] = await Promise.all([
				$.session.id(),
				$.session.root(),
				$.clock.now(),
			]);
			await $.fs.write(atRoot(root, heartbeatPath(session)), String(now));
		} catch {
			// The request goes on; the status line reads a missing or old heartbeat as hooks that stopped.
		}
	};
	const step = newStep();
	await beat();
	const stream = next(e);
	try {
		for await (const chunk of stream) {
			switch (chunk.kind) {
				case "tool":
					waitFor(chunk.id, step);
					break;
				case "stop":
					step.settle(chunk.usage);
					await beat();
					break;
				default:
					break;
			}
			yield chunk;
		}
		return await stream.result;
	} finally {
		step.settle(null);
	}
};

// Core sets `text`; a result a hook answered beneath carries only `result`, which the model reads as its text or its JSON.
const modelText = (result: unknown, text: string | undefined): string =>
	text ?? (typeof result === "string" ? result : JSON.stringify(result));

/** A result counts with its `context`, since both land in the next request. */
export const onToolCall: HookFor<"tool.call"> = async (_$, e, next) => {
	const step = takeStep(e.tool_use_id);
	const answer = await next(e);
	if (step === undefined || answer.deny !== undefined) {
		return answer;
	}
	const chars =
		modelText(answer.result, answer.text).length +
		(answer.context?.join("").length ?? 0);
	const bound = boundOf(await step.reading, step.passed, chars);
	if (bound.withhold) {
		return { deny: WITHHELD(bound) };
	}
	step.passed += bound.tokens;
	return answer;
};
