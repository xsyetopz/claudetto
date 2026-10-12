// The bounds of the `agents` slice.
// `MAX_TURNS` is the most turns that each agent takes before it stops.
// Each agent file holds the same number as its `maxTurns`, and a test pins the copy.

export const MAX_TURNS = {
  debugger: 61,
  implementer: 61,
  investigator: 31,
  planner: 41,
  researcher: 41,
  reviewer: 41,
} as const;
