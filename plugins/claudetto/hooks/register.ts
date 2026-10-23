import type { On, PluginOptions } from "claude-code";
import {
  onOffer as h17,
  onAgentCall as h18,
} from "../slices/agents/adapters/mod.ts";
import {
  keepOptions as h0,
  onAskUserQuestion as h1,
  onDescribe as h2,
} from "../slices/decide/adapters/mod.ts";
import {
  onCommand as h3,
  onStop as h4,
  onBoxCall as h30,
} from "../slices/finish/adapters/mod.ts";
import { onPlanCall as h5 } from "../slices/ground/adapters/mod.ts";
import {
  onCheck as h6,
  onCheckFail as h7,
  keepOptions as h19,
  onPermission as h23,
  onMonitor as h27,
  onStop as h28,
  onTitle as h29,
} from "../slices/guard/adapters/mod.ts";
import {
  keepOptions as h8,
  onTurnComplete as h10,
  onTurnStep as h11,
  onPrompt as h25,
  onStop as h26,
  onResume as h43,
} from "../slices/handoff/adapters/mod.ts";
import {
  onStart as h20,
  onEdited as h21,
  onPrompt as h22,
  onGitView as h24,
} from "../slices/hygiene/adapters/mod.ts";
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
} from "../slices/notes/adapters/mod.ts";
import {
  keepOptions as h12,
  onAttachment as h13,
  onContext as h14,
  onToolDescribe as h15,
  onCompact as h39,
  onMeasure as h40,
  onPrompt as h41,
  onBatch as h42,
} from "../slices/prompt/adapters/mod.ts";

export const register = (on: On, options: PluginOptions): void => {
  h0(options);
  h8(options);
  h12(options);
  h19(options);
  // eval: agent.offer agents
  on("agent.offer", h17);
  // eval: classic.PostToolUse hygiene
  on("classic.PostToolUse", { tool_name: ["Edit", "Write", "Bash"] }, h21);
  // eval: classic.PermissionRequest guard
  on("classic.PermissionRequest", h23);
  // eval: classic.Stop finish
  on("classic.Stop", h4);
  // eval: classic.Stop handoff
  on("classic.Stop", { stop_hook_active: false }, h26);
  // eval: classic.Stop guard
  on("classic.Stop", { stop_hook_active: [true, false] }, h28);
  // eval: classic.Stop notes
  on("classic.Stop", { hook_event_name: "Stop" }, h38);
  // eval: classic.UserPromptSubmit hygiene
  on("classic.UserPromptSubmit", h22);
  // eval: command.run finish
  on("command.run", { command: "goal" }, h3);
  // eval: prompt.attachment prompt
  on(
    "prompt.attachment",
    { type: ["goal_status", "tool_hosts_notice", "plan_mode"] },
    h13,
  );
  // eval: prompt.context prompt
  on("prompt.context", h14);
  // eval: prompt.submit handoff
  on("prompt.submit", h25);
  // eval: session.compact prompt
  on("session.compact", h39);
  // eval: session.measure prompt
  on("session.measure", h40);
  // eval: classic.UserPromptSubmit prompt
  on("classic.UserPromptSubmit", { hook_event_name: "UserPromptSubmit" }, h41);
  // eval: classic.PostToolBatch prompt
  on("classic.PostToolBatch", h42);
  // eval: session.start hygiene
  on("session.start", h20);
  // eval: classic.SessionStart handoff
  on("classic.SessionStart", { source: ["resume", "fork"] }, h43);
  // eval: tool.call agents
  on("tool.call", { tool: ["Agent"] }, h18);
  // eval: tool.call decide
  on("tool.call", { tool: ["AskUserQuestion"] }, h1);
  // eval: tool.call finish
  on("tool.call", { tool: ["Edit", "Write"] }, h30);
  // eval: tool.call ground
  on("tool.call", { tool: ["Write", "Edit"] }, h5);
  // eval: tool.call guard monitor
  on("tool.call", { tool: ["Monitor", "TaskStop"] }, h27);
  // eval: tool.call guard title
  on(
    "tool.call",
    { tool: ["Bash"], command: /\bgh\s+(?:pr|issue)\s+create\b/ },
    h29,
  );
  // eval: tool.call hygiene
  on("tool.call", { tool: ["Bash"] }, h24);
  // eval: tool.check notes
  on(
    "tool.check",
    { tool: ["Bash", "Edit", "Glob", "Grep", "Read", "WebFetch", "Write"] },
    h31,
  );
  // eval: classic.PostToolUseFailure notes
  on("classic.PostToolUseFailure", { tool_name: ["Bash"] }, h32);
  // eval: classic.PostToolUse notes
  on("classic.PostToolUse", { tool_name: ["Bash"] }, h33);
  // eval: turn.complete notes
  on("turn.complete", h34);
  // eval: turn.start notes
  on("turn.start", h37);
  // eval: ui.render notes band
  on("ui.render", { component: "AbovePrompt" }, h35);
  // eval: ui.render notes message
  on("ui.render", { component: "AssistantMessage" }, h36);
  // eval: tool.check guard
  on("tool.check", h6).catch(h7);
  // eval: tool.describe decide
  on("tool.describe", { tool: ["AskUserQuestion"] }, h2);
  // eval: tool.describe prompt
  on("tool.describe", { tool: DESCRIBED }, h15);
  // eval: turn.complete handoff
  on(
    "turn.complete",
    { reason: ["answer", "aborted", "refusal", "error"] },
    h10,
  );
  // eval: turn.step handoff
  on("turn.step", h11);
  // eval: turn.step notes
  on("turn.step", { turnId: /^/ }, h44);
};

const DESCRIBED =
  "Agent Bash Edit EnterWorktree ExitWorktree LSP ListAgents ListMcpResourcesTool Read ReadMcpResourceDirTool ReadMcpResourceTool SendMessage Skill TodoWrite ToolSearch Workflow Write".split(
    " ",
  );
