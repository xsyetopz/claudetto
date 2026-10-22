// Lab tests of the `off` hook of the `prompt` slice: `prompt.attachment`.
// The hook under test sits above the stub of the engine, so the stub answers `next(e)`.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const attach = ($: Engine, on: On, type: string) => {
  on("prompt.attachment", () => ({ text: "engine text" }));
  return $.prompt.attachment({
    type,
    text: "engine text",
    origin: { kind: "engine" },
  });
};

test("`prompt.attachment` leaves out an attachment of an `off` kind", async ($: Engine, on: On) => {
  expect((await attach($, on, "tool_hosts_notice")).text).toBeNull();
});

test("`prompt.attachment` keeps an attachment of another kind", async ($: Engine, on: On) => {
  expect((await attach($, on, "auto_mode")).text).toBe("engine text");
});
