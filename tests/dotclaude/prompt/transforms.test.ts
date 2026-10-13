// Tests of the transforms of the built-in sections: the section ids and the part mechanics.

import { expect, test } from "bun:test";
import { transformText } from "../../../plugins/dotclaude/slices/prompt/domain/apply.ts";
import { TRANSFORMS } from "../../../plugins/dotclaude/slices/prompt/transforms/index.ts";
import { applyParts } from "../../../plugins/dotclaude/slices/prompt/transforms/parts.ts";

const CONFIRMED = [
  "action_caution",
  "actions",
  "communication",
  "context_management",
  "doing_tasks",
  "env_info_simple",
  "intro",
  "lean_body",
  "memory",
  "pronouns",
  "session_guidance",
  "system",
  "tone",
  "tools",
  "total_tokens",
];

test("there is one transform for each confirmed section id", () => {
  expect([...TRANSFORMS.keys()].sort()).toEqual(CONFIRMED);
});

test("a part replaces each match of its anchor", () => {
  expect(applyParts("a x a", [{ anchor: /a/g, text: "b" }])).toBe("b x b");
});

test("a part keeps a dollar sign of its text", () => {
  expect(applyParts("a", [{ anchor: /a/g, text: "$&" }])).toBe("$&");
});

test("a part with no match changes nothing", () => {
  expect(applyParts("abc", [{ anchor: /z/g, text: "y" }])).toBe("abc");
});

test("a section with no transform keeps its text", () => {
  expect(transformText("not_a_section", "built-in text")).toBe("built-in text");
});

test("the transform of `total_tokens` keeps the text", () => {
  const text = "<total_tokens>15000000 tokens left</total_tokens>";
  expect(transformText("total_tokens", text)).toBe(text);
});

test("the transform of `env_info_simple` drops the fast-mode line and keeps the lines around it", () => {
  const text =
    " - Platform: darwin\n - Fast mode for Claude Code uses the same model with faster output. It can be toggled with /fast.\n - Shell: zsh\n";
  expect(transformText("env_info_simple", text)).toBe(
    " - Platform: darwin\n - Shell: zsh\n",
  );
});

test("the transform of `env_info_simple` drops the fast-mode line when it is the last line of the section", () => {
  const text =
    " - Platform: darwin\n - Fast mode for Claude Code uses the same model with faster output. It can be toggled with /fast.";
  expect(transformText("env_info_simple", text)).toBe(" - Platform: darwin");
});
