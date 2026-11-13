import type { On } from "claude-code";

import { MODEL_SECTIONS } from "./texts";

// A section keeps its id and scope, so the shared sections stay ahead of the session ones.
export const modelPrompt = (on: On): void => {
	for (const [model, texts] of MODEL_SECTIONS) {
		on("prompt.compose", { model }, async (_$, e, next) => {
			const answer = await next(e);
			return {
				sections: answer.sections.map(({ id, scope, text }) => ({
					id,
					scope,
					text: texts.get(id) ?? text,
				})),
			};
		});
	}
};
