#!/usr/bin/env bun
// The `PreToolUse` hook on `AskUserQuestion`: asks Jev, and answers for the user when Jev is sure.
// The key comes from `TYPESAFE_API_KEY` in the environment of Claude Code.
// On each fault the hook prints nothing and exits 0, so the question goes to the user as Claude sent it.

import {
  API,
  type AskQuestion,
  ATTEMPT_TIMEOUT_MS,
  answersOf,
  askBody,
  hookOutput,
  jevAnswers,
} from "./jev.ts";

const main = async (): Promise<void> => {
  const key = Bun.env["TYPESAFE_API_KEY"];
  if (!key) return;
  const event = JSON.parse(await Bun.stdin.text()) as {
    tool_input?: Record<string, unknown>;
  };
  const input = event.tool_input ?? {};
  const questions = Array.isArray(input["questions"])
    ? (input["questions"] as AskQuestion[])
    : [];
  const body = askBody(questions);
  if (body === null) return;
  const res = await fetch(API, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
  });
  if (!res.ok) return;
  const out = hookOutput(
    input,
    jevAnswers(questions, answersOf(await res.json())),
  );
  if (out !== null) console.log(JSON.stringify(out));
};

await main().catch(() => undefined);
