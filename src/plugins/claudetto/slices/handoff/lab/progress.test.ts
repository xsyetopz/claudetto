// Lab tests of the progress of the handoff (spec `handoff`, "Visible progress").
// On a terminal, the `session.compact` hook shows a status line while it writes the handoff,
// and a notice in the transcript names the file at the end.
// With no surface, as in `-p`, the hook draws nothing.

import type { ModelForkResult, On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { MESSAGES, stubSession } from "./shared.ts";

const HANDOFF = "- Read `a.txt`: DONE, line 1 is `amber-falcon-42`.";

const NO_USAGE = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
};

/** What the stubs answer: the surfaces of the session and the fork. */
type World = {
  surfaces?: ("terminal" | "desktop")[];
  fork?: ModelForkResult;
};

/** The stubs for `world`, and the lines that the hook drew, in order. */
const engine = (on: On, world: World = {}): string[] => {
  const drawn: string[] = [];
  on("session.surfaces", () => ({ value: world.surfaces ?? ["terminal"] }));
  on("model.fork", () => ({
    value: world.fork ?? { isAnswered: true, text: HANDOFF, usage: NO_USAGE },
  }));
  on("fs.write", () => ({ value: undefined }));
  stubSession(on);
  on("ui.status", (_$, e) => {
    drawn.push(`status ${e.text ?? "none"}`);
    return { value: undefined };
  });
  on("ui.log", (_$, e) => {
    // A debug line, such as a line of the ground check, is not drawn.
    if (e.to !== "debug") drawn.push(`log ${e.text}`);
    return { value: undefined };
  });
  return drawn;
};

const compact = ($: Engine) =>
  $.session.compact({ trigger: "auto", messages: MESSAGES });

test("on a terminal, a status line shows while the handoff is written, and a notice names the file", async ($: Engine, on: On) => {
  const drawn = engine(on);
  await compact($);
  expect(drawn[0]).toBe("status Writing the handoff…");
  expect(drawn[1]).toBe("status none");
  expect(drawn[2]).toMatch(
    /^log The handoff is in \.claudetto\/handoffs\/handoff-\d{8}T\d{6}Z\.md, 100 bytes, by a (warm fork|cold write)\.$/,
  );
  expect(drawn).toHaveLength(3);
});

test("with no surface, as in `-p`, the handoff draws nothing", async ($: Engine, on: On) => {
  const drawn = engine(on, { surfaces: [] });
  const result = await compact($);
  expect(result.messages).toBeDefined();
  expect(drawn).toEqual([]);
});

test("on a terminal, a failed handoff removes the status line and gives no notice", async ($: Engine, on: On) => {
  const drawn = engine(on, {
    fork: { isAnswered: true, text: "No handoff.", usage: NO_USAGE },
  });
  const result = await compact($);
  expect(result.skip).toBe("the built-in compaction");
  expect(drawn).toEqual(["status Writing the handoff…", "status none"]);
});
