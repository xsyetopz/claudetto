// The destructive git forms of the corpus match a rule of the settings snippet, and no safe form does (task 7.11, D43).
// A command is a string that no test runs.

import { expect, test } from "bun:test";
import { SNIPPET } from "../../../plugins/claudetto/snippets.ts";
import { matchingRules } from "../../support/bash-rules.ts";
import corpus from "./corpus/git.json" with { type: "json" };

const permissions = (
  SNIPPET as { permissions: { ask: string[]; deny: string[] } }
).permissions;
const RULES = [...permissions.ask, ...permissions.deny].filter((rule) =>
  rule.startsWith("Bash(git "),
);
const matched = (command: string) => matchingRules(RULES, command).length > 0;

test("each destructive git form of the corpus matches a rule", () => {
  expect(corpus.match.filter((command) => !matched(command))).toStrictEqual([]);
});

test("no safe git form of the corpus matches a rule", () => {
  expect(corpus.pass.filter(matched)).toStrictEqual([]);
});

test("no rule matches a form that only the `guard` hook can stop", () => {
  expect(corpus.gap.filter(matched)).toStrictEqual([]);
});
