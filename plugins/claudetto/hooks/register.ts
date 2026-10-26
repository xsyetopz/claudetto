import type { On, PluginOptions } from "claude-code";
import { keepOptions } from "../kernel/options.ts";
import { onOffer as h17, onAgentCall as h18 } from "../modules/agents/index.ts";
import {
  onCheck as h6,
  onCheckFail as h7,
  onPermission as h23,
  onMonitor as h27,
  onStop as h28,
  onTitle as h29,
  onWait as h47,
  onSecrets as h50,
} from "../modules/gate/index.ts";
import {
  onAskUserQuestion as h1,
  onDescribe as h2,
} from "../modules/jev/index.ts";
import {
  GLOB_TOOL,
  GREP_TOOL,
  onTurnComplete as h10,
  onTurnStep as h11,
  onAttachment as h13,
  onContext as h14,
  onToolDescribe as h15,
  onStart as h20,
  onEdited as h21,
  onChangedFiles as h22,
  onGitView as h24,
  onHandoverOffer as h25,
  onHandoverStop as h26,
  onCompact as h39,
  onMeasure as h40,
  onUsageLine as h41,
  onBatch as h42,
  onResume as h43,
  onSubagentCall as h45,
  onSubagentEnd as h46,
  onSearchCall as h48,
  onSearchStart as h49,
  onOutputEnv as h54,
  onSubagentFail as h55,
} from "../modules/session/index.ts";
import {
  onCommand as h3,
  onGoalStop as h4,
  onPlanCall as h5,
  onBoxCall as h30,
  onCheck as h31,
  onFail as h32,
  onPass as h33,
  onTurnComplete as h34,
  onBand as h35,
  onMessage as h36,
  onNotePrompt as h37,
  onBackgroundStop as h38,
  onStep as h44,
  onDiffEnv as h51,
  onSave as h52,
  onUndo as h53,
} from "../modules/work/index.ts";

export const register = (on: On, options: PluginOptions): void => {
  keepOptions(options);
  // rule: agents.offer
  on("agent.offer", h17);
  // rule: session.ledger
  on("classic.PostToolUse", { tool_name: ["Edit", "Write", "Bash"] }, h21);
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
  // rule: session.changed-files
  on("classic.UserPromptSubmit", h22);
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
  on("session.start", { cwd: /^/ }, h51);
  // rule: session.bash-output
  on("session.start", { surface: /^/ }, h54);
  // rule: session.search-register
  on("session.start", { isInteractive: [true, false] }, h49);
  // rule: session.resume
  on("classic.SessionStart", { source: ["resume", "fork"] }, h43);
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
  on(
    "tool.call",
    { tool: ["Bash"], command: /\bgh\s+(?:pr|issue)\s+create\b/ },
    h29,
  );
  // rule: gate.long-wait
  on("tool.call", { tool: ["Bash"] }, h47);
  // rule: session.git-view
  on("tool.call", { tool: ["Bash"] }, h24);
  // rule: session.search-call
  on("tool.call", { tool: [GREP_TOOL, GLOB_TOOL] }, h48);
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
  on("turn.step", { turnId: /^/ }, h44);
};

const DESCRIBED =
  "Agent Bash Edit EnterWorktree ExitWorktree LSP ListAgents ListMcpResourcesTool Read ReadMcpResourceDirTool ReadMcpResourceTool SendMessage Skill TodoWrite ToolSearch Workflow Write".split(
    " ",
  );
