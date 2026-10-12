// The replies that the providers read (`domain/reply.ts`): the JSON of the CLI and the JSON of the model.
// Each check gives a reply as a string, so no test reaches the CLI or a model.

import { expect, test } from "bun:test";
import {
  parseCliOutput,
  parseModelReply,
} from "../../../plugins/dotclaude/slices/decide/domain/reply.ts";
import type { DecisionRequest } from "../../../plugins/dotclaude/slices/decide/ports.ts";

const PICK: DecisionRequest = {
  question: "Which store?",
  options: [{ key: "sql" }, { key: "kv" }],
};

const YES_NO: DecisionRequest = { question: "Use the cache?" };

const cliReply = (value: unknown): string => JSON.stringify(value);

test("a CLI reply with a text and an answer of a listed choice is parsed", () => {
  const stdout = cliReply({
    text: "  sql fits  ",
    answer: { choice: "sql", confidence: 0.8 },
  });
  expect(parseCliOutput(`${stdout}\n`, PICK)).toEqual({
    text: "sql fits",
    answer: { choice: "sql", confidence: 0.8 },
  });
});

test("a CLI reply with a choice outside the options gives no answer", () => {
  const stdout = cliReply({
    text: "maybe",
    answer: { choice: "redis", confidence: 0.8 },
  });
  expect(parseCliOutput(stdout, PICK)).toBeUndefined();
});

test("a CLI reply with a confidence outside 0 to 1 gives no answer", () => {
  const stdout = cliReply({
    text: "sql",
    answer: { choice: "sql", confidence: 1.5 },
  });
  expect(parseCliOutput(stdout, PICK)).toBeUndefined();
});

test("a CLI reply with an empty text gives no answer", () => {
  const stdout = cliReply({
    text: "  ",
    answer: { choice: "sql", confidence: 0.8 },
  });
  expect(parseCliOutput(stdout, PICK)).toBeUndefined();
});

test("a CLI reply that is not JSON gives no answer", () => {
  expect(parseCliOutput("sql, relations fit", PICK)).toBeUndefined();
});

test("a yes or no request accepts the choices `yes` and `no` only", () => {
  const yes = cliReply({
    text: "P(yes) = 0.90",
    answer: { choice: "yes", confidence: 0.9 },
  });
  const other = cliReply({
    text: "maybe",
    answer: { choice: "sql", confidence: 0.9 },
  });
  expect(parseCliOutput(yes, YES_NO)?.answer.choice).toBe("yes");
  expect(parseCliOutput(other, YES_NO)).toBeUndefined();
});

test("a model reply in a JSON code fence is parsed with its reason", () => {
  const reply =
    '```json\n{"choice": "kv", "confidence": 0.75, "reason": "keys are enough"}\n```';
  expect(parseModelReply(reply, PICK)).toEqual({
    text: "kv (confidence 0.75)\nkeys are enough",
    answer: { choice: "kv", confidence: 0.75 },
  });
});

test("a bare model reply without a reason gives the choice and the confidence", () => {
  const reply = '{"choice": "sql", "confidence": 0.6}';
  expect(parseModelReply(reply, PICK)).toEqual({
    text: "sql (confidence 0.60)",
    answer: { choice: "sql", confidence: 0.6 },
  });
});

test("a model reply that is not JSON gives no answer", () => {
  expect(parseModelReply("I think sql is best.", PICK)).toBeUndefined();
});

test("a model reply with a choice outside the options gives no answer", () => {
  const reply = '{"choice": "redis", "confidence": 0.9}';
  expect(parseModelReply(reply, PICK)).toBeUndefined();
});

test("a model reply with a confidence that is not a number gives no answer", () => {
  const reply = '{"choice": "sql", "confidence": "high"}';
  expect(parseModelReply(reply, PICK)).toBeUndefined();
});
