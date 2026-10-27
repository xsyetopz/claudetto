import type { On, PluginOptions } from "claude-code";
import { keepOptions } from "../kernel/options.ts";
import {
	onOffer as h17,
	onAgentCall as h18,
} from "../modules/agents/adapters/mod.ts";
import {
	onCheck as h6,
	onCheckFail as h7,
	onPermission as h23,
	onMonitor as h27,
	onStop as h28,
	onTitle as h29,
	onWait as h47,
} from "../modules/gate/adapters/mod.ts";
import { onResult as h50 } from "../modules/gate/secrets/adapters/mod.ts";
import {
	onAskUserQuestion as h1,
	onDescribe as h2,
} from "../modules/jev/adapters/mod.ts";
import {
	onTurnComplete as h10,
	onTurnStep as h11,
	onPrompt as h25,
	onStop as h26,
	onResume as h43,
	onClear as h58,
} from "../modules/session/handoff/adapters/mod.ts";
import {
	onStart as h20,
	onEdited as h21,
	onIntent as h56,
} from "../modules/session/hygiene/adapters/mod.ts";
import {
	onAttachment as h13,
	onContext as h14,
	onToolDescribe as h15,
	onCompact as h39,
	onMeasure as h40,
	onPrompt as h41,
	onBatch as h42,
	onSubagentCall as h45,
	onSubagentEnd as h46,
	onSubagentFail as h55,
} from "../modules/session/prompt/adapters/mod.ts";
import { onOutputEnv as h54 } from "../modules/session/prompt/adapters/output.ts";
import {
	onCommand as h3,
	onStop as h4,
	onBoxCall as h30,
} from "../modules/work/finish/adapters/mod.ts";
import { onPlanCall as h5 } from "../modules/work/ground/adapters/mod.ts";
import {
	onCheck as h31,
	onFail as h32,
	onPass as h33,
	onTurnComplete as h34,
	onBand as h35,
	onMessage as h36,
	onPrompt as h37,
	onStop as h38,
	onStep as h44,
} from "../modules/work/notes/adapters/mod.ts";
import {
	onDiffEnv as h51,
	onSave as h52,
	onUndo as h53,
} from "../modules/work/protect/adapters/mod.ts";
import { onStop as h57 } from "../modules/work/reply/adapters/mod.ts";

/** Matches any value of a key, so a rule fires when the key is present. */
const ANY_VALUE = /^/;

const GH_CREATE = /\bgh\s+(?:pr|issue)\s+create\b/;

export const register = (on: On, options: PluginOptions): void => {
	keepOptions(options);
	// rule: agents.offer
	on("agent.offer", h17);
	// rule: session.ledger
	on("classic.PostToolUse", { tool_name: ["Edit", "Write", "Bash"] }, h21);
	// rule: session.ledger-intent
	on("classic.PreToolUse", { tool: ["Edit", "Write"] }, h56);
	// rule: work.bash-save
	on("classic.PreToolUse", { tool: ["Bash"] }, h52);
	// rule: gate.permission
	on("classic.PermissionRequest", h23);
	// rule: work.goal-stop
	on("classic.Stop", h4);
	// rule: session.handover-stop
	on("classic.Stop", { stop_hook_active: false }, h26);
	// rule: gate.monitor-stop
	on("classic.Stop", { stop_hook_active: [true, false] }, h28);
	// rule: work.background-stop
	on("classic.Stop", { hook_event_name: "Stop" }, h38);
	// rule: work.reply-opening
	on("classic.Stop", { stop_hook_active: false }, h57);
	// rule: work.goal
	on("command.run", { command: "goal" }, h3);
	// rule: session.attachment
	on(
		"prompt.attachment",
		{ type: ["goal_status", "tool_hosts_notice", "plan_mode"] },
		h13,
	);
	// rule: session.context
	on("prompt.context", h14);
	// rule: session.handover-offer
	on("prompt.submit", h25);
	// rule: session.compact
	on("session.compact", h39);
	// rule: session.measure
	on("session.measure", h40);
	// rule: session.usage-line
	on("classic.UserPromptSubmit", { hook_event_name: "UserPromptSubmit" }, h41);
	// rule: session.batch
	on("classic.PostToolBatch", h42);
	// rule: work.bash-undo
	on("classic.PostToolUse", { tool_name: ["Bash"] }, h53);
	// rule: session.turn-limit
	on("classic.PostToolUse", h45);
	// rule: session.turn-limit-fail
	on("classic.PostToolUseFailure", h55);
	// rule: session.turn-end
	on("classic.SubagentStop", h46);
	// rule: session.sweep
	on("session.start", h20);
	// rule: work.bash-diff
	on("session.start", { cwd: ANY_VALUE }, h51);
	// rule: session.bash-output
	on("session.start", { surface: ANY_VALUE }, h54);
	// rule: session.resume
	on("classic.SessionStart", { source: ["resume", "fork"] }, h43);
	// rule: session.clear-resume
	on("classic.SessionStart", { source: ["clear"] }, h58);
	// rule: gate.secrets
	on("tool.call", h50);
	// rule: agents.default-type
	on("tool.call", { tool: ["Agent"] }, h18);
	// rule: jev.ask
	on("tool.call", { tool: ["AskUserQuestion"] }, h1);
	// rule: work.box
	on("tool.call", { tool: ["Edit", "Write"] }, h30);
	// rule: work.ground
	on("tool.call", { tool: ["Write", "Edit"] }, h5);
	// rule: gate.monitor-dedupe
	on("tool.call", { tool: ["Monitor", "TaskStop"] }, h27);
	// rule: gate.gh-title
	on("tool.call", { tool: ["Bash"], command: GH_CREATE }, h29);
	// rule: gate.long-wait
	on("tool.call", { tool: ["Bash"] }, h47);
	// rule: work.note-check
	on(
		"tool.check",
		{ tool: ["Bash", "Edit", "Glob", "Grep", "Read", "WebFetch", "Write"] },
		h31,
	);
	// rule: work.note-fail
	on("classic.PostToolUseFailure", { tool_name: ["Bash"] }, h32);
	// rule: work.note-pass
	on("classic.PostToolUse", { tool_name: ["Bash"] }, h33);
	// rule: work.note-turn
	on("turn.complete", h34);
	// rule: work.note-prompt
	on("turn.start", h37);
	// rule: work.note-band
	on("ui.render", { component: "AbovePrompt" }, h35);
	// rule: work.note-message
	on("ui.render", { component: "AssistantMessage" }, h36);
	// rule: gate.check
	on("tool.check", h6).catch(h7);
	// rule: jev.describe
	on("tool.describe", { tool: ["AskUserQuestion"] }, h2);
	// rule: session.tool-describe
	on("tool.describe", { tool: DESCRIBED }, h15);
	// rule: session.handover-turn
	on(
		"turn.complete",
		{ reason: ["answer", "aborted", "refusal", "error"] },
		h10,
	);
	// rule: session.handover-step
	on("turn.step", h11);
	// rule: work.note-step
	on("turn.step", { turnId: ANY_VALUE }, h44);
};

const DESCRIBED =
	"Agent Bash Edit EnterWorktree ExitWorktree LSP ListAgents ListMcpResourcesTool Read ReadMcpResourceDirTool ReadMcpResourceTool SendMessage Skill TodoWrite ToolSearch Workflow Write".split(
		" ",
	);
