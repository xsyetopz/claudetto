// The agent types that `surface` drops: dotclaude does not use them, so `agent.offer` leaves them out of the listing and out of dispatch.

/** The built-in agent types that dotclaude does not use. */
export const DROPPED_AGENTS: readonly string[] = [
  "claude-code-guide",
  "statusline-setup",
];

/** True when `agent.offer` leaves the agent type out. */
export const isDropped = (agent: string): boolean =>
  DROPPED_AGENTS.includes(agent);
