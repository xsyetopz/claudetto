import type { HookFor, On } from "claude-code";
import type { Block, BlockContext, WithOptions } from "../block.ts";

const keyOf = (value: unknown): string | undefined =>
	typeof value === "string" && value !== "" ? value : undefined;

/** A sensitive option reaches no Bash child on its own, so the key goes through the env, never through the context. */
export const onContext7Start: WithOptions<HookFor<"session.start">> = async (
	$,
	e,
	next,
	options,
) => {
	const key = keyOf(options["CONTEXT7_API_KEY"]);
	if (
		key !== undefined &&
		(await $.env.get("CONTEXT7_API_KEY")) === undefined
	) {
		await $.env.set("CONTEXT7_API_KEY", key);
	}
	return next(e);
};

export const context7: Block = {
	id: "context7",
	kind: "session",
	routes: ["session.start", "env.get", "env.set"],
	needs: "2.1.314",
};

export const attachContext7 = (on: On, context: BlockContext): void => {
	// `decide` holds the bare `session.start` registration, and a repeat throws, so this one matches every start by its field.
	on("session.start", { isInteractive: [true, false] }, ($, e, next) =>
		onContext7Start($, e, next, context.options),
	);
};
