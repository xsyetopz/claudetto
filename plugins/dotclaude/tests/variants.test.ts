// Lab tests of the prompt variants: the `prompt.compose` hook and the `agent.spawn` hook.
// The hook under test sits above the stub of the engine, so the stub answers `next(e)`.

import { expect, test } from "claude-code/testing";

const ENGINE = [
  { id: "intro", text: "engine intro", scope: "shared" },
  { id: "system", text: "engine system", scope: "shared" },
  { id: "doing_tasks", text: "engine tasks", scope: "shared" },
  { id: "actions", text: "engine actions", scope: "shared" },
  { id: "tools", text: "engine tools", scope: "shared" },
  { id: "tone", text: "engine tone", scope: "shared" },
  { id: "memory", text: "engine memory", scope: "session" },
  { id: "future_section", text: "engine future", scope: "session" },
];

// The session id is a variable, so a test can start a new session without a new hook.
let session = "s1";

function stub(on, id = "s1") {
  session = id;
  on("session.id", () => ({ value: session }));
  on("prompt.compose", () => ({ sections: ENGINE }));
}

const compose = ($, model, traits = []) =>
  $.prompt.compose({
    model,
    promptModel: model,
    surfaces: ["terminal"],
    tools: [],
    outputStyle: null,
    traits,
  });
const bytes = (r) => r.sections.map((s) => s.text).join("\n\n");

const MODELS = [
  "claude-opus-5-5",
  "claude-sonnet-5-5",
  "claude-haiku-5-5",
  "claude-fable-5-1",
];

for (const model of MODELS) {
  test(`the variant of ${model} replaces the sections of the engine`, async ($, on) => {
    stub(on);
    const out = await compose($, model);
    const ids = out.sections.map((s) => s.id);
    expect(ids.slice(0, 5)).toEqual([
      "dotclaude:role",
      "dotclaude:tasks",
      "dotclaude:actions",
      "dotclaude:tools",
      "dotclaude:tone",
    ]);
    expect(ids.slice(5)).toEqual(["memory", "future_section"]);
    const text = bytes(out);
    expect(text).not.toContain("engine intro");
  });
}

test("two turns and a model switch give the same prompt bytes", async ($, on) => {
  stub(on);
  const first = bytes(await compose($, "claude-sonnet-5-5"));
  expect(bytes(await compose($, "claude-sonnet-5-5"))).toBe(first);
  expect(bytes(await compose($, "claude-haiku-5-5"))).toBe(first);
});

test("a new session chooses its own variant", async ($, on) => {
  stub(on, "s-a");
  const a = bytes(await compose($, "claude-opus-5-5"));
  session = "s-b";
  expect(bytes(await compose($, "claude-haiku-5-5"))).not.toBe(a);
});

test("a model with no variant keeps the sections of the engine", async ($, on) => {
  stub(on, "s-unknown");
  expect((await compose($, "some-other-model")).sections).toEqual(ENGINE);
});

test("the bare prompt keeps the section of the engine", async ($, on) => {
  stub(on, "s-bare");
  const out = await compose($, "claude-haiku-5-5", ["bare"]);
  expect(out.sections).toEqual(ENGINE);
});

test("a spawn on Haiku 5.5 ends the task prompt with its block one time", async ($, on) => {
  let seen = "";
  on("agent.spawn", (_$, e) => {
    seen = e.prompt;
    return { model: "claude-haiku-5-5" };
  });
  await $.agent.spawn({ prompt: "Read the file.", model: "haiku" });
  expect(seen.startsWith("Read the file.")).toBe(true);
  expect(seen.endsWith("</dotclaude_model_notes>")).toBe(true);
  expect(seen.split("<dotclaude_model_notes>").length).toBe(2);
  await $.agent.spawn({ prompt: seen, model: "haiku" });
  expect(seen.split("<dotclaude_model_notes>").length).toBe(2);
});
