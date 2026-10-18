// The rules of D53 (the least code) and D54 (pushback tiers, a missing tool) in the system prompt, and the line of D54 on a correction in the output style.
// Each test pins the structure and the key phrases, and not a whole paragraph.

import { expect, test } from "bun:test";
import path from "node:path";
import { LEAN_BODY } from "../../../plugins/claudetto/slices/prompt/domain/lean-body.ts";

const STYLE = await Bun.file(
  path.join(
    import.meta.dir,
    "../../../src/plugins/claudetto/slices/styles/styles/Concise.md",
  ),
).text();

test("the system prompt holds the rule of the least code (D53)", () => {
  for (const phrase of [
    "least code that does the whole task",
    "read your own diff",
    "fewer lines",
    "rewrite your change",
  ])
    expect(LEAN_BODY, phrase).toContain(phrase);
  expect(LEAN_BODY).toContain("suggestion at the end");
});

test("the system prompt holds the three tiers on pushback (D54) and not the rule of one time", () => {
  expect(LEAN_BODY).not.toContain("say so one time");
  expect(LEAN_BODY).not.toContain("then do what the user decides");
  for (const phrase of [
    "do not do it as asked",
    "push back",
    "ask for the reason",
    "explicit override",
    "the user decides",
  ])
    expect(LEAN_BODY, phrase).toContain(phrase);
});

test("the system prompt makes a missing tool a step (D54)", () => {
  expect(LEAN_BODY).toContain("missing tool");
  expect(LEAN_BODY).toContain("install it");
});

test("the output style gives a correction the next action, with no agreement or apology (D54)", () => {
  expect(STYLE).toContain("correction");
  expect(STYLE).toContain("next action");
  expect(STYLE).toContain("no opening agreement or apology");
});
