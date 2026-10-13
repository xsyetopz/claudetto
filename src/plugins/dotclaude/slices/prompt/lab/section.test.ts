// Lab tests of the `prompt.section` hook of the `prompt` slice: the transform of each built-in section.
// The hook under test sits above the stub of the engine, so the stub answers `next(e)`.

import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const SUMMARY =
  "When the conversation grows long, some or all of the current context is summarized; the summary is provided in the next context window.";

test("with `DISABLE_COMPACT`, the `context_management` section changes", async ($: Engine, on: On) => {
  on("prompt.section", () => ({ text: "engine text" }));
  mock.env(on, { DISABLE_COMPACT: "1" });
  const out = await $.prompt.section({
    name: "context_management",
    text: SUMMARY,
  });
  expect(out.text).not.toBe("engine text");
  expect(out.text).not.toContain("is summarized");
});

test("without `DISABLE_COMPACT`, the `context_management` section keeps the engine text", async ($: Engine, on: On) => {
  on("prompt.section", () => ({ text: "engine text" }));
  const out = await $.prompt.section({
    name: "context_management",
    text: SUMMARY,
  });
  expect(out.text).toBe("engine text");
});

test("a section with a transform gets its shorter text", async ($: Engine, on: On) => {
  on("prompt.section", () => ({ text: "engine text" }));
  const text =
    "You have a persistent file-based memory at `/x/`. This directory already exists — write to it directly with the Write tool (do not run mkdir or check for its existence).";
  const out = await $.prompt.section({ name: "memory", text });
  expect(out.text).not.toBe("engine text");
  expect(out.text?.length).toBeLessThan(text.length);
});

test("another section keeps the text of the engine", async ($: Engine, on: On) => {
  on("prompt.section", () => ({ text: "engine text" }));
  const out = await $.prompt.section({
    name: "unknown_section",
    text: "built-in text",
  });
  expect(out.text).toBe("engine text");
});

test("a section with null text keeps the engine text", async ($: Engine, on: On) => {
  on("prompt.section", () => ({ text: "engine text" }));
  const out = await $.prompt.section({ name: "memory", text: null });
  expect(out.text).toBe("engine text");
});
