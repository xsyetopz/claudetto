import type { On } from "claude-code";

export const register = (on: On): void => {
	on("prompt.context", async (_$, e, next) => {
		const answer = await next(e);
		return { ...answer, blocks: [...answer.blocks, { name: {{json plugin}}, text: {{json context}} }] };
	});
};
