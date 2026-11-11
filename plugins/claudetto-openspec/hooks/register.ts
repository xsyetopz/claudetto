import type { On } from "claude-code";

import { openspec } from "./openspec.ts";
import {
	TOOL_CALL,
	TOOL_DESCRIPTION,
	TOOL_INPUT_SCHEMA,
	TOOL_NAME,
} from "./texts.ts";

export const register = (on: On): void => {
	// The engine takes one unmatched `session.start` per module.
	on("session.start", async ($, e, next) => {
		const out = await next(e);
		await $.tool.register({
			name: TOOL_NAME,
			description: TOOL_DESCRIPTION,
			inputSchema: TOOL_INPUT_SCHEMA,
			isDeferred: true,
		});
		return out;
	});
	on("tool.call", { tool: [TOOL_CALL] }, async ($, e) => ({
		result: await openspec(
			{
				// The engine rejects `$.fs` as a value: each op is spelled at its call site.
				fs: {
					read: (path) => $.fs.read(path),
					write: (...a) => $.fs.write(...a),
					list: (...a) => $.fs.list(...a),
					exists: (...a) => $.fs.exists(...a),
					stat: (...a) => $.fs.stat(...a),
					log: (message) => {
						$.ui.log(message);
					},
				},
				run: (argv) => $.process.run(argv),
				root: await $.session.root(),
				// The local calendar day, as upstream archive names it (UTC would be tomorrow or yesterday near midnight).
				date: new Date(await $.clock.now()).toLocaleDateString("en-CA"),
			},
			e,
		),
	})).catch((_error, _e, next) => ({
		deny: next.error.message ?? next.error.kind,
	}));
};
