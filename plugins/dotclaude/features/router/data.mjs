// The router table of design D12: a task class to a model and an effort.
// The eval search (`just eval --router`) tunes it, and the wiki links the report for each changed row.
// Each model is a full id, because the alias `haiku` resolves to Haiku 4.5 on Bedrock, Vertex, and Foundry.

export const OPUS = "claude-opus-5-5";
export const SONNET = "claude-sonnet-5-5";
export const HAIKU = "claude-haiku-5-5";

/**
 * The pair of a subagent for each task class (decision of the user 2026-10-09).
 * The source is `evals/results/2026-10-09T12-16-54-262Z` and the effort guide of Anthropic,
 * which tells Haiku 5.5 to start at `medium` for agentic work and says that `low` can skip a search or a check.
 * `tests`, `web`, and `bulk` take the pair with no loss in the report.
 * `search`, `scoped`, `plan`, and `orchestration` take Haiku 5.5 at `medium`, one step above the cheapest pair with no loss.
 * `debug` takes Haiku 5.5 at `high`, because Haiku 5.5 at `low` had no loss and the guide gives `high` to longer agent tasks.
 * `review` takes Sonnet 5.5 at `medium`, because each Haiku 5.5 pair lost and Sonnet 5.5 at `low` had no loss.
 * `audit` takes Sonnet 5.5 at `high`, because its cases do not separate the pairs (task 11.12) and an audit is a stricter review.
 */
export const TABLE = {
  search: { model: HAIKU, effort: "medium" },
  tests: { model: HAIKU, effort: "low" },
  web: { model: HAIKU, effort: "medium" },
  bulk: { model: HAIKU, effort: "medium" },
  scoped: { model: HAIKU, effort: "medium" },
  debug: { model: HAIKU, effort: "high" },
  review: { model: SONNET, effort: "medium" },
  audit: { model: SONNET, effort: "high" },
  plan: { model: HAIKU, effort: "medium" },
  orchestration: { model: HAIKU, effort: "medium" },
};

/**
 * The effort of the main loop for each class of `classifyPrompt`, on the model of the session.
 * The main loop keeps its model, because a model change rebuilds the prompt cache and an effort change keeps it (task 2.16).
 * The guide of Anthropic also says that a change of effort is often a better lever than a change of model.
 */
export const MAIN_EFFORT = {
  plan: "high",
  review: "high",
  debug: "high",
  orchestration: "medium",
};

/** The pair of a debug task after the failed fixes of `ESCALATE_AFTER_FAILED_FIXES`. */
export const DEBUG_ESCALATED = { model: OPUS, effort: "medium" };

/** The pair of a task with a prompt over `HAIKU_PROMPT_MAX_TOKENS`, in place of a Haiku 5.5 pair. */
export const LONG_PROMPT_PAIR = { model: SONNET, effort: "medium" };

/** The `never` row of design D12: the efforts and pairs that no default may choose. The caps in `cap.mjs` enforce it. */
export const NEVER = { efforts: ["max"], pairs: [[SONNET, "xhigh"]] };

/** The variables that defeat the router. Each one is reported and the router does not route while it is set. */
export const BLOCKING_ENV = [
  "CLAUDE_CODE_EFFORT_LEVEL",
  "CLAUDE_CODE_SUBAGENT_MODEL_FORCE",
];

/** The class of each agent type, before the keywords refine it. A plugin prefix (`dotclaude:`) is removed first. */
export const TYPE_CLASS = {
  investigator: "search",
  "test-runner": "tests",
  implementer: "scoped",
  debugger: "debug",
  reviewer: "review",
  Explore: "search",
  Plan: "plan",
};

/** The aliases for the classic `PreToolUse` fallback, whose `model` is an enum. The `haiku` alias is Haiku 4.5 on Bedrock, Vertex, and Foundry. */
export const ALIASES = { [OPUS]: "opus", [SONNET]: "sonnet", [HAIKU]: "haiku" };

// Short and exact lists, because a keyword is the weakest signal (`model-routing.md` section 4.1).
// The lists are tested in the order of `KEYWORD_ORDER`.
export const KEYWORDS = {
  tests: /\b(?:run (?:the )?tests?|test suite|lint|type-?check)\b/,
  debug: /\b(?:root cause|flaky|regression|stack trace|fails|failing|crash)\b/,
  audit: /\b(?:trust boundary|threat model|security audit)\b/,
  review: /\b(?:review|audit|security)\b/,
  plan: /\b(?:plan|design|architecture)\b/,
  web: /\b(?:https?:\/\/|web|online|documentation)/,
  bulk: /\b(?:rename|codemod|migrate)\b/,
  search: /\b(?:grep|find|list|where is|locate)\b/,
};
export const KEYWORD_ORDER = [
  "audit",
  "tests",
  "debug",
  "review",
  "plan",
  "web",
  "bulk",
  "search",
];

/**
 * The variable and value that turn on the classic `PreToolUse` route (`cli.mjs`).
 * The route is the fallback of design D13, so it stays off while the `turn.step` route works (task 2.4).
 * With it on, the hook sets `model` and `effort` in the `Agent` input, and the module then sees an explicit choice and leaves the spawn alone.
 */
export const FALLBACK_ENV = {
  name: "DOTCLAUDE_ROUTER_ROUTE",
  value: "classic",
};

/** The origins of `prompt.submit` that are a prompt of the user. A notification or a peer message gets no route. */
export const USER_ORIGINS = ["composer", "bridge", "sdk"];
