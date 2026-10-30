import type { On } from "claude-code";
import {
	onEnd,
	onRender,
	onStep,
	onSubmit,
	RENDER_MATCH,
} from "../../hooks.ts";
import { keepOptions } from "../../options.ts";
import type { Block, BlockContext } from "../block.ts";

export const youShouldKnow: Block = {
	id: "you-should-know",
	kind: "screen",
	routes: ["turn.step", "prompt.submit", "session.end", "ui.render"],
	needs: "2.1.314",
};

export const attachYouShouldKnow = (on: On, context: BlockContext): void => {
	// The options are kept first, because the hooks are registered by reference and read them from there.
	keepOptions(context.options);
	on("turn.step", onStep);
	on("prompt.submit", onSubmit);
	on("session.end", onEnd);
	on("ui.render", RENDER_MATCH, onRender);
};
