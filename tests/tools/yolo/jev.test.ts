import { describe, expect, test } from "bun:test";
import {
  type AskQuestion,
  askBody,
  hookOutput,
  jevAnswers,
  type Picked,
} from "../../../tools/yolo/jev.ts";

const lock: AskQuestion = {
  question: "Which lock?",
  header: "Lock",
  multiSelect: false,
  options: [
    { label: "Mutex", description: "Simple." },
    { label: "RW lock", description: "More readers." },
  ],
};
const colors: AskQuestion = {
  question: "Which colors?",
  header: "Colors",
  multiSelect: true,
  options: [{ label: "Red" }, { label: "Blue" }],
};
const sure = {
  kind_0: { choice: "facts", confidence: 0.9 },
  pick_0: { choice: "RW lock", confidence: 0.85 },
};

describe("askBody", () => {
  test("asks the kind and the pick of each single-select question, and skips a multi-select question", () => {
    const body = askBody([lock, colors]);
    expect(Object.keys(body?.questions ?? {}).sort()).toEqual([
      "kind_0",
      "pick_0",
    ]);
    expect(body?.model).toBe("jev-latest");
    expect(body?.state).toContain("Question 0: Which lock?");
  });

  test("gives `null` when no question has 2 options and one select", () => {
    expect(askBody([colors])).toBeNull();
  });
});

describe("jevAnswers", () => {
  test("answers each question by its text, with a note that Jev picked it", () => {
    expect(jevAnswers([lock], sure)).toEqual({
      answers: { "Which lock?": "RW lock" },
      annotations: {
        "Which lock?": {
          notes:
            "Jev answered this question for the user (confidence 0.85). The user did not see it.",
        },
      },
    });
  });

  test("gives `null` when one question of the call is a multi-select question", () => {
    expect(jevAnswers([lock, colors], sure)).toBeNull();
  });

  test("gives `null` for a preference question, a pick under 0.8, a kind under 0.8, and an unknown label", () => {
    for (const answers of [
      { ...sure, kind_0: { choice: "preference", confidence: 0.9 } },
      { ...sure, pick_0: { choice: "RW lock", confidence: 0.79 } },
      { ...sure, kind_0: { choice: "facts", confidence: 0.79 } },
      { ...sure, pick_0: { choice: "Spin", confidence: 0.9 } },
      {},
    ])
      expect(jevAnswers([lock], answers)).toBeNull();
  });
});

describe("hookOutput", () => {
  test("allows the call with the answers added, and keeps each field of the input as it is", () => {
    const input = { questions: [lock], metadata: { source: "x" } };
    const picked = jevAnswers([lock], sure) as Picked;
    const out = hookOutput(input, picked);
    expect(out?.hookSpecificOutput.hookEventName).toBe("PreToolUse");
    expect(out?.hookSpecificOutput.permissionDecision).toBe("allow");
    expect(out?.hookSpecificOutput.updatedInput).toEqual({
      ...input,
      ...picked,
    });
  });

  test("gives no output with no answers, or when the input has answers, which Claude Code refuses to replace", () => {
    expect(hookOutput({ questions: [lock] }, null)).toBeNull();
    const picked = jevAnswers([lock], sure);
    expect(hookOutput({ questions: [lock], answers: {} }, picked)).toBeNull();
  });
});
