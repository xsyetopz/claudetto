// The fixes of the prompt audit (`prompt-audit.md` of `release-0-2-0` at commit `1c579e10`: https://github.com/xsyetopz/claudetto/blob/1c579e10/openspec/changes/release-0-2-0/prompt-audit.md) that a text test can pin: key phrases and the lack of the old text, and not whole paragraphs.

import { expect, test } from "bun:test";
import path from "node:path";

const SLICES = "src/plugins/claudetto/slices";
const read = (rel: string) =>
  Bun.file(path.join(import.meta.dir, "../../..", rel)).text();
const prompt = (name: string) => read(`${SLICES}/prompt/prompts/${name}.md`);

test("the install of a missing tool and the rule of a block agree on the permission dialog and the fallback", async () => {
  const doing = await prompt("doing-tasks");
  const blocks = await prompt("blocks");
  expect(doing).toContain("permission dialog");
  expect(blocks).toContain("permission dialog");
  expect(blocks).toContain("a missing tool");
  expect(doing).toContain("make the result with a tool that is there");
  expect(blocks).toContain("make the result with a tool that is there");
});

test("a different defect that was there before the task stays out of scope", async () => {
  const doing = await prompt("doing-tasks");
  expect(doing).toContain(
    "different defect that was there before the task stays out of scope",
  );
  expect(doing).not.toContain("a defect of the task's kind stays in scope");
});

test("the text of verification holds the rule of D7 with no tool name", async () => {
  const text = await prompt("verification");
  expect(text).toContain("fast check");
  expect(text).toContain("once for each finished part");
  expect(text).toContain("no check");
});

test("the story preset runs a fast check after a change and the full checks for a task group", async () => {
  const yaml = await read(
    `${SLICES}/spec/skills/spec/schemas/story/schema.yaml`,
  );
  const apply = yaml.slice(yaml.indexOf("\napply:"));
  expect(apply).toContain("fast check");
  expect(apply).toContain("full checks");
});

test("the style and the end-of-turn text agree, with no numeric cap", async () => {
  const style = await read(`${SLICES}/styles/styles/Concise.md`);
  const end = await prompt("communication-end-of-turn-summary");
  expect(style).not.toContain("last new fact");
  expect(style).not.toContain("because the user asks");
  expect(end).not.toContain("one or two sentences");
  expect(style).toContain("End on what is next.");
  expect(end).toContain("what changed");
  expect(end).toContain("what is next");
});

test("the communication part does not tell the model to hide its reasoning", async () => {
  const code = await read(`${SLICES}/prompt/transforms/communication.ts`);
  const text = await prompt("communication-state-results");
  expect(code).not.toContain("Do not narrate your reasoning");
  expect(text).toContain("give the reason for a decision");
});

test("the two texts on risky actions have the same approval sentence and no durable approval", async () => {
  const sentence = "An approval for one action does not approve the next one.";
  const actions = await prompt("actions");
  const caution = await prompt("action-caution-for-actions-that-are");
  for (const text of [actions, caution]) {
    expect(text).toContain(sentence);
    expect(text).not.toContain("durable approval");
  }
});

test("the memory type `user` does not save each detail", async () => {
  expect(await prompt("memory-types-types")).not.toContain("each detail");
});

test("the `Agent` description gives a reason for `subagent_type`", async () => {
  const text = await prompt("tool-agent");
  expect(text).not.toContain("Always set");
  expect(text).toContain("because the model, effort, and tools");
});
