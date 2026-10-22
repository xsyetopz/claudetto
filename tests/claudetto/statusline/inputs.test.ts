// The inputs of 2.1.300 and later: a field that is absent is out, and a field with a wrong type shows the error mark.

import { expect, test } from "bun:test";
import { main } from "../../../plugins/claudetto/slices/statusline/adapters/cli.ts";
import { depsFor, NOW, type Run, rowsOf } from "./support.ts";

const WINDOW_S = NOW / 1000;

test("an input with no `rate_limits`, no `effort`, and no `cost` leaves out those segments", async () => {
  const { text, run } = await rowsOf({
    rate_limits: undefined,
    effort: undefined,
    cost: undefined,
  });
  expect(text).not.toContain("◷");
  expect(text).not.toContain("$");
  expect(text).not.toContain("high");
  expect(run.err).toStrictEqual([]);
});

test("a window whose percent is not a number shows the error mark, not an empty field", async () => {
  const { text } = await rowsOf({
    rate_limits: { five_hour: { used_percentage: "x", resets_at: WINDOW_S } },
  });
  expect(text).toContain("◷ 5h ✗");
});

test("a cost that is not a number shows the error mark", async () => {
  const { text } = await rowsOf({ cost: { total_cost_usd: "free" } });
  expect(text).toContain("✗");
  expect(text).not.toContain("$");
});

test("an effort with no level shows the error mark", async () => {
  const { text } = await rowsOf({ effort: { level: 5 } });
  expect(text).toContain("◈ Opus 5.5 ✗");
});

test("the spend limit shows as a window", async () => {
  const { text } = await rowsOf({
    rate_limits: { spend_limit: { used_percentage: 40, resets_at: WINDOW_S } },
  });
  expect(text).toContain("◷ spend");
});

test("a pull request shows its number and its review state", async () => {
  const { text } = await rowsOf({
    pr: { number: 12, kind: "pr", review_state: "approved" },
  });
  expect(text).toContain("⇄ #12 approved");
});

test("a merge request shows `!` before its number", async () => {
  const { text } = await rowsOf({
    pr: { number: 7, kind: "mr", review_state: "pending" },
  });
  expect(text).toContain("⇄ !7 pending");
});

const ESC = String.fromCharCode(27);

test("a pull request has the color of its review state", async () => {
  const at = async (review_state: string) =>
    (
      await rowsOf(
        { pr: { number: 1, review_state } },
        { env: { COLUMNS: "160" } },
      )
    ).text;
  const approved = await at("approved");
  const changes = await at("changes_requested");
  expect(approved).toContain(`${ESC}[38;2;78;186;101m⇄`);
  expect(changes).toContain(`${ESC}[38;2;255;107;128m⇄`);
});

test("a warm cache shows the countdown to `expires_at`", async () => {
  const { text } = await rowsOf({
    prompt_cache: {
      warm: true,
      caching_observed: true,
      expires_at: WINDOW_S + 252,
    },
  });
  expect(text).toContain("⌁ 4m");
});

test("a cold cache shows the cold mark and the tokens to cache again", async () => {
  const { text } = await rowsOf({
    prompt_cache: {
      warm: false,
      caching_observed: true,
      recache_tokens_if_cold: 120_000,
    },
  });
  expect(text).toContain("⌁ cold +120k");
});

test("a cold cache with no token count shows only the cold mark", async () => {
  const { text } = await rowsOf({
    prompt_cache: { warm: false, caching_observed: true },
  });
  expect(text).toContain("⌁ cold");
  expect(text).not.toContain("cold +");
});

test("a provider with no observed caching leaves out the cache segment", async () => {
  const { text } = await rowsOf({
    prompt_cache: { warm: false, caching_observed: false },
  });
  expect(text).not.toContain("⌁");
});

test("a `warm` value that is not a boolean shows the error mark", async () => {
  const { text } = await rowsOf({
    prompt_cache: { warm: "yes", caching_observed: true },
  });
  expect(text).toContain("⌁ ✗");
});

test("`--help` prints the usage and exits 0 without a read of stdin", async () => {
  const run: Run = { status: -1, out: [], err: [] };
  const stdin = async () => {
    throw new Error("stdin read");
  };
  run.status = await main(["--help"], depsFor("", run, { stdin }));
  expect(run.status).toBe(0);
  expect(run.out.join("\n")).toContain("Usage: claudetto-statusline");
  expect(run.err).toStrictEqual([]);
});

test("an empty stdin gives one error line that names `claudetto-statusline`, and exits 0", async () => {
  const run: Run = { status: -1, out: [], err: [] };
  run.status = await main([], depsFor("", run));
  expect(run.status).toBe(0);
  expect(run.err).toHaveLength(1);
  expect(run.err[0]).toContain("claudetto-statusline");
  expect(run.err[0]?.trimEnd().split("\n")).toHaveLength(1);
});
