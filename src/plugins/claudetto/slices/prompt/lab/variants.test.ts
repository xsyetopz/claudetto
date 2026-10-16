// Lab tests of the prompt variants: the `prompt.compose` hook, and the `agent.spawn` and `session.append` hooks.
// The hook under test sits above the stub of the engine, so the stub answers `next(e)`.

import type { On, PromptComposeSection, PromptComposeTrait } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const ENGINE: PromptComposeSection[] = [
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

const stub = (on: On, id = "s1") => {
  session = id;
  on("session.id", () => ({ value: session }));
  on("prompt.compose", () => ({ sections: ENGINE }));
  // The `system` section reads the compaction state, so the stub gives an empty environment.
  mock.env(on, {});
};

const compose = ($: Engine, model: string, traits: PromptComposeTrait[] = []) =>
  $.prompt.compose({
    model,
    promptModel: model,
    surfaces: ["terminal"],
    tools: [],
    outputStyle: null,
    traits,
  });
const bytes = (r: { sections: readonly PromptComposeSection[] }) =>
  r.sections.map((s) => s.text).join("\n\n");

const MODELS = [
  "claude-opus-5-5",
  "claude-sonnet-5-5",
  "claude-haiku-5-5",
  "claude-fable-5-1",
];

// The model that the stub of the engine resolves for the next spawn, as the agent file or `CLAUDE_CODE_SUBAGENT_MODEL` does.
let resolved = "claude-haiku-5-5";
let seen = "";

/** The stubs of a spawn test: `agent.spawn` resolves to `resolved`, and the mock session keeps each row. */
const stubSpawn = (on: On) => {
  on("agent.spawn", (_$, e) => {
    seen = e.prompt;
    return { model: resolved, agentId: "a1" };
  });
  mock.session(on);
};

/** A spawn from an Opus session, then the task row of the subagent, which gives the text of the row as stored. */
const spawnRow = async (
  $: Engine,
  model: string,
  prompt = "Read the file.",
  callModel?: string,
) => {
  resolved = model;
  await $.agent.spawn({
    tool_use_id: "t1",
    prompt,
    description: "Read the file.",
    subagentType: "reviewer",
    provider: { plugin: "engine", tier: "core" },
    ...(callModel ? { model: callModel } : {}),
    parentModel: "claude-opus-5-5",
    background: false,
    fork: false,
  });
  return rowText($, prompt, "a1");
};

/** The text of a user row of the loop `agentId`, or of the main loop, as the session stored it. */
const rowText = async ($: Engine, text: string, agentId?: string) => {
  const row = await $.session.append({
    message: { type: "user", role: "user", content: [{ type: "text", text }] },
    door: "prompt",
    origin: { kind: "sdk" },
    uuid: "u1",
    ...(agentId ? { agentId } : {}),
  });
  return String(row.message?.content[0]?.["text"] ?? "");
};

for (const model of MODELS) {
  test(`the variant of ${model} replaces the sections of the engine`, async ($: Engine, on: On) => {
    stub(on);
    const out = await compose($, model);
    const ids = out.sections.map((s) => s.id);
    expect(ids).toEqual([
      "claudetto:intro",
      "claudetto:doing_tasks",
      "claudetto:system",
      "claudetto:blocks",
      "claudetto:verification",
      "claudetto:actions",
      "claudetto:tools",
      "claudetto:counts",
      // Sonnet 5.5 has no model notes.
      ...(model.includes("sonnet") ? [] : ["claudetto:model_notes"]),
      "memory",
      "future_section",
    ]);
    const text = bytes(out);
    expect(text).not.toContain("engine intro");
  });
}

test("two turns and a model switch give the same prompt bytes", async ($: Engine, on: On) => {
  stub(on);
  const first = bytes(await compose($, "claude-sonnet-5-5"));
  expect(bytes(await compose($, "claude-sonnet-5-5"))).toBe(first);
  expect(bytes(await compose($, "claude-haiku-5-5"))).toBe(first);
});

test("a new session chooses its own variant", async ($: Engine, on: On) => {
  stub(on, "s-a");
  const a = bytes(await compose($, "claude-opus-5-5"));
  session = "s-b";
  expect(bytes(await compose($, "claude-haiku-5-5"))).not.toBe(a);
});

test("a model with no variant keeps the sections of the engine", async ($: Engine, on: On) => {
  stub(on, "s-unknown");
  expect((await compose($, "some-other-model")).sections).toEqual(ENGINE);
});

test("the bare prompt keeps the section of the engine", async ($: Engine, on: On) => {
  stub(on, "s-bare");
  const out = await compose($, "claude-haiku-5-5", ["bare"]);
  expect(out.sections).toEqual(ENGINE);
});

test("a spawn passes its task prompt on unchanged", async ($: Engine, on: On) => {
  stubSpawn(on);
  await spawnRow($, "claude-haiku-5-5");
  expect(seen).toBe("Read the file.");
});

test("a spawn with no `model` gets the block of its own model", async ($: Engine, on: On) => {
  stubSpawn(on);
  const text = await spawnRow($, "claude-haiku-5-5");
  const haiku = await spawnRow($, "claude-haiku-5-5", "Read it.", "haiku");
  const opus = await spawnRow($, "claude-opus-5-5", "Read it.");
  const block = (t: string) => t.slice(t.indexOf("<claudetto_model_notes>"));
  expect(text.startsWith("Read the file.\n\n<claudetto_model_notes>")).toBe(
    true,
  );
  expect(block(text)).toBe(block(haiku));
  expect(block(text)).not.toBe(block(opus));
});

// biome-ignore lint/plugin: a test name that a `slice.ts` file references
test("a spawn on Haiku 5.5 ends the task row with its block one time", async ($: Engine, on: On) => {
  stubSpawn(on);
  const first = await spawnRow(
    $,
    "claude-haiku-5-5",
    "Read the file.",
    "haiku",
  );
  expect(first.endsWith("</claudetto_model_notes>")).toBe(true);
  expect(first.split("<claudetto_model_notes>").length).toBe(2);
  const again = await spawnRow($, "claude-haiku-5-5", first, "haiku");
  expect(again.split("<claudetto_model_notes>").length).toBe(2);
});

test("a spawn on a model with no variant keeps its task row", async ($: Engine, on: On) => {
  stubSpawn(on);
  expect(await spawnRow($, "some-other-model")).toBe("Read the file.");
});

test("a row of the main loop keeps its text", async ($: Engine, on: On) => {
  stubSpawn(on);
  await $.agent.spawn({
    tool_use_id: "t1",
    prompt: "Read the file.",
    description: "Read the file.",
    subagentType: "reviewer",
    provider: { plugin: "engine", tier: "core" },
    parentModel: "claude-opus-5-5",
    background: false,
    fork: false,
  });
  expect(await rowText($, "Read the file.")).toBe("Read the file.");
});

// biome-ignore lint/plugin: a test name that states the rule
test("`prompt.compose` names `claudetto-run-checks` by a path under the plugin root of the session", async ($: Engine, on: On) => {
  stub(on);
  const text = bytes(await compose($, "claude-haiku-5-5"));
  const path = /`(\S+claudetto-run-checks)`, and do not run/.exec(text)?.[1];
  expect(path).toBeDefined();
  // The path is absolute, so a Bash session without the plugin `bin/` folder in `PATH` still finds the file.
  expect(path).toMatch(/^\/.*\/bin\/claudetto-run-checks$/);
});
