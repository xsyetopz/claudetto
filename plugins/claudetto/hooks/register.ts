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
import { onCommand as h3, onStop as h4 } from "../slices/goal/adapters/mod.ts";
import { onPlanCall as h5 } from "../slices/ground/adapters/mod.ts";
import {
  onCheck as h6,
  onCheckFail as h7,
  keepOptions as h19,
} from "../slices/guard/adapters/mod.ts";
import {
  keepOptions as h8,
  onCompact as h9,
  onTurnComplete as h10,
  onTurnStep as h11,
} from "../slices/handoff/adapters/mod.ts";
import {
  onStart as h20,
  onEdited as h21,
  onPrompt as h22,
} from "../slices/hygiene/adapters/mod.ts";
import {
  keepOptions as h12,
  onAttachment as h13,
  onContext as h14,
  onToolDescribe as h15,
} from "../slices/prompt/adapters/mod.ts";
import { onRender as h16 } from "../slices/reply/adapters/mod.ts";

export const register = (on: On, options: PluginOptions): void => {
  h0(options);
  h8(options);
  h12(options);
  h19(options);
  // eval: agent.offer agents
  on("agent.offer", h17);
  // eval: classic.PostToolUse hygiene
  on("classic.PostToolUse", { tool_name: ["Edit", "Write"] }, h21);
  // eval: classic.Stop goal
  on("classic.Stop", h4);
  // eval: classic.UserPromptSubmit hygiene
  on("classic.UserPromptSubmit", h22);
  // eval: command.run goal
  on("command.run", { command: "goal" }, h3);
  // eval: prompt.attachment prompt
  on("prompt.attachment", { type: ["goal_status", "tool_hosts_notice"] }, h13);
  // eval: prompt.context prompt
  on("prompt.context", h14);
  // eval: session.compact handoff
  on("session.compact", { trigger: ["auto", "manual", "plugin"] }, h9);
  // eval: session.start hygiene
  on("session.start", h20);
  // eval: tool.call agents
  on("tool.call", { tool: ["Agent"] }, h18);
  // eval: tool.call decide
  on("tool.call", { tool: ["AskUserQuestion"] }, h1);
  // eval: tool.call ground
  on("tool.call", { tool: ["Write", "Edit"] }, h5);
  // eval: tool.check guard
  on(
    "tool.check",
    { tool: ["Bash", "Read", "Grep", "Glob", "Edit", "Write"] },
    h6,
  ).catch(h7);
  // eval: tool.describe decide
  on("tool.describe", { tool: ["AskUserQuestion"] }, h2);
  // eval: tool.describe prompt
  on(
    "tool.describe",
    {
      tool: [
        "Agent",
        "Bash",
        "Edit",
        "ListAgents",
        "Read",
        "Skill",
        "ToolSearch",
        "Workflow",
        "Write",
      ],
    },
    h15,
  );
  // eval: turn.complete handoff
  on(
    "turn.complete",
    { reason: ["answer", "aborted", "refusal", "error"] },
    h10,
  );
  // eval: turn.step handoff
  on("turn.step", h11);
  // eval: ui.render reply
  on("ui.render", { component: "AssistantMessage" }, h16);
};
