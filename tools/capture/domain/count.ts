import { COUNT_ATTEMPTS, COUNT_BACKOFF_MS } from "../../limits.ts";
import type { Body, Wait } from "./types.ts";

export const countable = (body: Body) => {
  const { model, system, tools, messages, thinking, tool_choice } = body;
  return { model, system, tools, messages, thinking, tool_choice };
};

const credentials = (headers: Record<string, string>): string[] =>
  Object.entries(headers)
    .filter(([name]) => /^(?:authorization|x-api-key)$/i.test(name))
    .flatMap(([, value]) => [value, value.replace(/^Bearer\s+/i, "")])
    .filter((value) => value.length > 0);

// The credential of the request never reaches an error text.
export const redact = (text: string, headers: Record<string, string>): string =>
  credentials(headers).reduce(
    (out, secret) => out.split(secret).join("[redacted]"),
    text,
  );

export const readCount = (text: string): number => {
  const count = (JSON.parse(text) as { input_tokens?: unknown }).input_tokens;
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0)
    throw new Error(
      `count_tokens reply has no input_tokens: ${text.slice(0, 300)}`,
    );
  return count;
};

export const countTokens = async (
  upstream: string,
  body: Body,
  headers: Record<string, string>,
  query: string,
  wait: Wait,
): Promise<number> => {
  const send = () =>
    fetch(`${upstream}/v1/messages/count_tokens${query}`, {
      method: "POST",
      headers,
      body: JSON.stringify(countable(body)),
    });
  try {
    let res = await send();
    for (
      let delay = COUNT_BACKOFF_MS, tries = 1;
      res.status === 429 && tries < COUNT_ATTEMPTS;
      delay *= 2, tries++
    ) {
      await wait(delay);
      res = await send();
    }
    // Read the text before the status, so a reply that is not JSON keeps its status.
    const text = await res.text();
    if (!res.ok)
      throw new Error(`count_tokens ${res.status}: ${text.slice(0, 300)}`);
    return readCount(text);
  } catch (e) {
    throw new Error(redact(String((e as Error).message ?? e), headers));
  }
};
