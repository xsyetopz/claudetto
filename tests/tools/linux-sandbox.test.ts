// The pure parts of `just sandbox-linux`: the life of the login, the parse of the session, and the verdict.

import { expect, test } from "bun:test";
import {
  PONG,
  parseSession,
  type Session,
  tokenMinutes,
  verdict,
} from "../../tools/sandbox/linux/result.ts";

const NOW = 1_000_000_000_000;

test("`tokenMinutes` gives the whole minutes until `expiresAt`", () => {
  const credentials = JSON.stringify({
    claudeAiOauth: { expiresAt: NOW + 45 * 60_000 + 30_000 },
  });
  expect(tokenMinutes(credentials, NOW)).toBe(45);
});

test("`tokenMinutes` gives a negative value for an expired token", () => {
  const credentials = JSON.stringify({
    claudeAiOauth: { expiresAt: NOW - 5 * 60_000 },
  });
  expect(tokenMinutes(credentials, NOW)).toBe(-5);
});

test("`tokenMinutes` gives `undefined` when the login has no `expiresAt`", () => {
  expect(tokenMinutes("{}", NOW)).toBeUndefined();
  expect(tokenMinutes('{"claudeAiOauth":{}}', NOW)).toBeUndefined();
});

const JSONL = [
  '{"type":"system","subtype":"init"}',
  JSON.stringify({
    type: "assistant",
    message: {
      content: [
        { type: "text", text: "Running." },
        { type: "tool_use", name: "Bash", input: { command: "echo hi" } },
        { type: "tool_use", name: "Read", input: { file_path: "/x" } },
      ],
    },
  }),
  JSON.stringify({
    type: "user",
    message: {
      content: [
        { type: "tool_result", content: [{ type: "text", text: "exit=1" }] },
        { type: "tool_result", content: "plain" },
      ],
    },
  }),
  "not json",
  '{"type":"result","subtype":"success","total_cost_usd":0.012}',
].join("\n");

test("`parseSession` collects the `Bash` commands, the results, and the `result` message", () => {
  expect(parseSession(JSONL)).toStrictEqual({
    commands: ["echo hi"],
    results: ["exit=1", "plain"],
    cost: 0.012,
    subtype: "success",
  });
});

test("`parseSession` gives an empty session for empty output", () => {
  expect(parseSession("")).toStrictEqual({ commands: [], results: [] });
});

const session = (results: string[]): Session => ({ commands: [], results });

test("`verdict` is `blocked` when only the control reached the socket", () => {
  expect(verdict(PONG, session(["Permission denied\nexit=1"]))).toBe("blocked");
});

test("`verdict` is `reached` when the sandboxed call got the reply", () => {
  expect(verdict(PONG, session([`${PONG}\nexit=0`]))).toBe("reached");
});

test("`verdict` is `unknown` when the control failed or no call ran", () => {
  expect(verdict("Connection refused", session(["exit=1"]))).toBe("unknown");
  expect(verdict(PONG, session([]))).toBe("unknown");
});
