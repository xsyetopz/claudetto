// The router (tasks 11.1 and 11.2): the pins of its limits, the classifier, the cap, and the routes.
// Each test breaks one rule of design D12 and D13.

import { expect, test } from "bun:test";
import { SUBAGENT_CONTEXT_MAX } from "../../plugins/dotclaude/features/context/limits.mjs";
import {
  capEffort,
  stepDecision,
} from "../../plugins/dotclaude/features/router/cap.mjs";
import {
  classifyPrompt,
  classifySpawn,
} from "../../plugins/dotclaude/features/router/classify.mjs";
import {
  ALIASES,
  HAIKU,
  MAIN_EFFORT,
  NEVER,
  OPUS,
  SONNET,
  TABLE,
} from "../../plugins/dotclaude/features/router/data.mjs";
import {
  ALLOWED_EFFORTS,
  EFFORT_ORDER,
  HAIKU_PROMPT_MAX_TOKENS,
} from "../../plugins/dotclaude/features/router/limits.mjs";
import {
  blockedBy,
  routePrompt,
  routeSpawn,
} from "../../plugins/dotclaude/features/router/route.mjs";
import { SUBAGENT_EFFORTS } from "../../plugins/dotclaude/features/statusline/limits.mjs";

const spawn = (subagentType, over = {}) => ({
  subagentType,
  prompt: "Do the work.",
  description: "work",
  ...over,
});

test("the limits keep `max` out, Sonnet 5.5 below `xhigh`, and haiku 4.5 out of the roster", () => {
  for (const [model, list] of Object.entries(ALLOWED_EFFORTS)) {
    expect(list, model).not.toContain("max");
    expect(
      list.every((e) => EFFORT_ORDER.includes(e)),
      model,
    ).toBe(true);
  }
  expect(ALLOWED_EFFORTS[SONNET]).not.toContain("xhigh");
  expect(ALLOWED_EFFORTS["claude-haiku-4-5"]).toBeUndefined();
  expect(Object.keys(ALLOWED_EFFORTS)).toEqual([
    OPUS,
    SONNET,
    HAIKU,
    "claude-fable-5-1",
  ]);
});

test("the status line lists hold the efforts of the router, and the bounds agree", () => {
  for (const [model, list] of Object.entries(ALLOWED_EFFORTS))
    for (const e of list)
      expect(
        SUBAGENT_EFFORTS[model.replace(/^claude-/, "")] ?? list,
        model,
      ).toContain(e);
  expect(HAIKU_PROMPT_MAX_TOKENS).toBe(SUBAGENT_CONTEXT_MAX);
});

test("the table is the decision of 2026-10-09 and holds no never pair", () => {
  expect(TABLE).toEqual({
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
  });
  expect(MAIN_EFFORT).toEqual({
    plan: "high",
    review: "high",
    debug: "high",
    orchestration: "medium",
  });
  for (const [cls, { model, effort }] of Object.entries(TABLE)) {
    expect(NEVER.efforts, cls).not.toContain(effort);
    expect(ALLOWED_EFFORTS[model], cls).toContain(effort);
    expect(model, cls).toMatch(/^claude-/);
  }
});

test("the classifier gives each task class", () => {
  expect(classifySpawn(spawn("investigator", { prompt: "Where is X?" }))).toBe(
    "search",
  );
  expect(classifySpawn(spawn("Explore"))).toBe("search");
  expect(classifySpawn(spawn("test-runner"))).toBe("tests");
  expect(
    classifySpawn(
      spawn("dotclaude:investigator", { prompt: "Read https://x.dev/docs" }),
    ),
  ).toBe("web");
  expect(
    classifySpawn(
      spawn("implementer", { prompt: "Rename foo to bar in all files." }),
    ),
  ).toBe("bulk");
  expect(classifySpawn(spawn("implementer"))).toBe("scoped");
  expect(classifySpawn(spawn("debugger"))).toBe("debug");
  expect(classifySpawn(spawn("reviewer"))).toBe("review");
  expect(
    classifySpawn(
      spawn("reviewer", { prompt: "Audit the trust boundary of the parser." }),
    ),
  ).toBe("audit");
  expect(classifySpawn(spawn("Plan"))).toBe("plan");
  expect(
    classifySpawn(
      spawn("general-purpose", {
        prompt: "Find the root cause of the flaky test.",
      }),
    ),
  ).toBe("debug");
  expect(
    classifySpawn(spawn("general-purpose", { prompt: "Hello." })),
  ).toBeNull();
});

test("the classifier is deterministic and the main loop gets only its four classes", () => {
  const t = spawn("general-purpose", { prompt: "Plan the architecture." });
  expect(classifySpawn(t)).toBe(classifySpawn({ ...t }));
  expect(classifyPrompt("Design the new module.")).toBe("plan");
  expect(classifyPrompt("Review this change.")).toBe("review");
  expect(classifyPrompt("Audit the trust boundary.")).toBe("review");
  expect(classifyPrompt("Fix the regression.")).toBe("debug");
  expect(classifyPrompt("Rename foo to bar.")).toBe("orchestration");
  expect(classifyPrompt("Where is the config?")).toBe("orchestration");
});

test("each spawn class routes to its table pair with a full model id", () => {
  const r = (t) => routeSpawn(t, {});
  expect(r(spawn("test-runner"))).toMatchObject({
    routed: true,
    model: HAIKU,
    effort: "low",
  });
  expect(r(spawn("investigator"))).toMatchObject({
    model: "claude-haiku-5-5",
    effort: "medium",
  });
  expect(r(spawn("implementer"))).toMatchObject({
    model: HAIKU,
    effort: "medium",
  });
  expect(r(spawn("reviewer"))).toMatchObject({
    model: SONNET,
    effort: "medium",
  });
  expect(
    r(spawn("reviewer", { prompt: "Audit the trust boundary." })),
  ).toMatchObject({ model: SONNET, effort: "high" });
  expect(r(spawn("debugger"))).toMatchObject({ model: HAIKU, effort: "high" });
  expect(r(spawn("investigator")).model).not.toBe(ALIASES[HAIKU]);
});

test("a debug task goes to Opus 5.5 medium after two failed fixes, not after one", () => {
  expect(routeSpawn(spawn("debugger"), { failedFixes: 1 })).toMatchObject({
    model: HAIKU,
    effort: "high",
  });
  expect(routeSpawn(spawn("debugger"), { failedFixes: 2 })).toMatchObject({
    model: OPUS,
    effort: "medium",
  });
});

test("a prompt over 100K tokens does not go to Haiku 5.5", () => {
  const long = "x".repeat(4 * HAIKU_PROMPT_MAX_TOKENS + 8);
  expect(routeSpawn(spawn("investigator", { prompt: long }), {})).toMatchObject(
    { model: SONNET, effort: "medium" },
  );
  const edge = "x".repeat(4 * HAIKU_PROMPT_MAX_TOKENS);
  expect(routeSpawn(spawn("investigator", { prompt: edge }), {}).model).toBe(
    HAIKU,
  );
});

test("a fork spawn is skipped", () => {
  expect(routeSpawn(spawn("fork"), {})).toMatchObject({ routed: false });
});

test("an explicit model or effort in the `Agent` input is kept", () => {
  expect(routeSpawn(spawn("implementer", { model: "opus" }), {})).toMatchObject(
    { routed: false },
  );
  expect(routeSpawn(spawn("implementer", { effort: "low" }), {})).toMatchObject(
    { routed: false },
  );
});

test("a task with no class is left alone", () => {
  expect(
    routeSpawn(spawn("general-purpose", { prompt: "Hello." }), {}),
  ).toMatchObject({ routed: false });
});

test("a set `CLAUDE_CODE_EFFORT_LEVEL` or `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` stops routing with a report", () => {
  for (const name of [
    "CLAUDE_CODE_EFFORT_LEVEL",
    "CLAUDE_CODE_SUBAGENT_MODEL_FORCE",
  ]) {
    const state = { env: { [name]: "1" } };
    const a = routeSpawn(spawn("implementer"), state);
    expect(a.routed).toBe(false);
    expect(a.reason).toContain(`\`${name}\``);
    expect(routePrompt("Plan it.", state).routed).toBe(false);
  }
  expect(blockedBy({ CLAUDE_CODE_EFFORT_LEVEL: "", OTHER: "1" })).toEqual([]);
  expect(routeSpawn(spawn("implementer"), { env: {} }).routed).toBe(true);
});

test("the cap never gives `max`, nor `xhigh` on Sonnet 5.5", () => {
  expect(capEffort(OPUS, "max")).toBe("xhigh");
  expect(capEffort(HAIKU, "max")).toBe("xhigh");
  expect(capEffort(SONNET, "xhigh")).toBe("high");
  expect(capEffort(SONNET, "max")).toBe("high");
  expect(capEffort("claude-haiku-4-5", "low")).toBeUndefined();
  expect(capEffort(OPUS, "bogus")).toBeUndefined();
});

test("the cap does not raise the effort above the session effort", () => {
  expect(capEffort(OPUS, "high", "low")).toBe("low");
  expect(capEffort(SONNET, "medium", "low")).toBe("low");
  expect(capEffort(OPUS, "medium", "high")).toBe("medium");
  expect(routeSpawn(spawn("reviewer"), { sessionEffort: "low" }).effort).toBe(
    "low",
  );
  expect(routePrompt("Plan it.", { sessionEffort: "low" }).effort).toBe("low");
  expect(capEffort(OPUS, "high", "unknown")).toBe("high");
});

test("a prompt routes only the effort in the main loop, and the same input gives the same result", () => {
  const a = routePrompt("Design the new module.", {});
  expect(a).toEqual(routePrompt("Design the new module.", {}));
  expect(a).toEqual({ routed: true, class: "plan", effort: "high" });
  expect(routePrompt("Fix the regression.", {})).toEqual({
    routed: true,
    class: "debug",
    effort: "high",
  });
  expect(routePrompt("Fix the regression.", { failedFixes: 2 }).effort).toBe(
    "high",
  );
  expect(routePrompt("Hello.", {})).toEqual({
    routed: true,
    class: "orchestration",
    effort: "medium",
  });
});

test("a later step keeps the decision of the first step", () => {
  const first = { model: SONNET, effort: "medium" };
  const later = { model: OPUS, effort: "high" };
  expect(stepDecision(undefined, first, 0)).toBe(first);
  expect(stepDecision(first, later, 1)).toBe(first);
  expect(stepDecision(first, later, 0)).toBe(later);
});
