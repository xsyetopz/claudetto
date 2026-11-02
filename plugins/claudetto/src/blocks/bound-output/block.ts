import type { EngineInterface, MatchedHook, On } from "claude-code";
import type { Block, BlockContext, WithOptions } from "../block.ts";
import { isBoundedRun } from "./command.ts";
import { boundText } from "./cut.ts";
import { outputLimit } from "./option.ts";
import { boundResult, fullTextOf } from "./streams.ts";

export const BOUND_OUTPUT_DIR = ".claude/claudetto/output";

const BASH_MATCH = { tool: ["Bash"] } as const;

const outputPath = (id: string): string =>
	`${BOUND_OUTPUT_DIR}/output-${id.replaceAll(/[^\w-]/g, "_")}.txt`;

/** A file that cannot be written leaves the cut in place and says so, since an unbounded result is the cost this hook exists to remove. */
const save = async (
	$: EngineInterface,
	path: string,
	text: string,
): Promise<string | undefined> => {
	try {
		await $.fs.write(path, text);
		return path;
	} catch {
		return undefined;
	}
};

export const onBash: WithOptions<
	MatchedHook<"tool.call", typeof BASH_MATCH>
> = async ($, e, next, options) => {
	const answer = await next(e);
	const limit = outputLimit(options);
	if (limit === 0 || answer.deny !== undefined || !isBoundedRun(e.command)) {
		return answer;
	}
	const full = fullTextOf(answer.result);
	if (full === undefined || full.length <= limit) {
		return answer;
	}
	// A call that a plugin raises has no `tool_use_id`, so the clock names its file.
	const path = outputPath(e.tool_use_id || String(await $.clock.now()));
	const result = boundResult(answer.result, limit, path);
	if (JSON.stringify(result) === JSON.stringify(answer.result)) {
		return answer;
	}
	const saved = await save($, path, full);
	const text =
		answer.text === undefined
			? undefined
			: boundText(answer.text, limit, saved);
	return {
		...answer,
		result: boundResult(answer.result, limit, saved),
		...(text === undefined ? {} : { text }),
	};
};

export const boundOutput: Block = {
	id: "bound-output",
	kind: "policy",
	routes: ["tool.call"],
	needs: "2.1.314",
};

export const attachBoundOutput = (on: On, context: BlockContext): void => {
	on("tool.call", BASH_MATCH, ($, e, next) =>
		onBash($, e, next, context.options),
	);
};
