// The session of the handover fixture, shared by the hook lab and the unit tests in `tests/`. It imports no runtime module of `claude-code`, so `bun test` can load it.

import type { SessionMessage } from "claude-code";

/** The `AskUserQuestion` call of the fixture: the user picks `sql` and leaves `files` and `kv`. */
export const ASK = {
	tool_use_id: "q1",
	tool: "AskUserQuestion",
	input: {
		questions: [
			{
				question: "Which store?",
				options: [{ label: "sql" }, { label: "files" }, { label: "kv" }],
			},
		],
	},
	text: 'User has answered your questions: "Which store?"="sql". You can now continue.',
};

/** The messages of the fixture session, which the stub of `session.messages` gives. */
export const MESSAGES: SessionMessage[] = [
	{ role: "user", text: "Build the export.", toolUses: [], handle: "h0" },
	{ role: "assistant", text: "", toolUses: [ASK], handle: "h1" },
	{ role: "user", text: "Use `csv`, not JSON.", toolUses: [], handle: "h2" },
	{ role: "assistant", text: "Ok.", toolUses: [], handle: "h3" },
];
