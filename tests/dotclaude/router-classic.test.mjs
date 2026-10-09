// The classic `PreToolUse` fallback of the router (task 11.4): `features/router/cli.mjs`.
// It is off until `DOTCLAUDE_ROUTER_ROUTE=classic`, and it returns `updatedInput` with a model alias and an effort.

import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { decide } from "../../plugins/dotclaude/features/router/cli.mjs";
import {
  ALIASES,
  FALLBACK_ENV,
} from "../../plugins/dotclaude/features/router/data.mjs";

const ON = { [FALLBACK_ENV.name]: FALLBACK_ENV.value };
const agent = (input) => ({
  hook_event_name: "PreToolUse",
  tool_name: "Agent",
  cwd: "/w/app",
  tool_input: {
    subagent_type: "dotclaude:investigator",
    prompt: "Find where the parser is defined.",
    description: "find parser",
    ...input,
  },
});
const updated = (out) => out.hookSpecificOutput.updatedInput;

test("with the route on, an `Agent` call gets the alias and the effort of its class", () => {
  const out = decide(agent({}), ON);
  expect(out.hookSpecificOutput.hookEventName).toBe("PreToolUse");
  expect(updated(out)).toEqual({
    subagent_type: "dotclaude:investigator",
    prompt: "Find where the parser is defined.",
    description: "find parser",
    model: "haiku",
    effort: "medium",
  });
});

test("the output sets no permission decision", () => {
  const out = decide(agent({}), ON);
  expect(Object.keys(out.hookSpecificOutput).sort()).toEqual([
    "hookEventName",
    "updatedInput",
  ]);
});

test("the model is an alias of the enum and never a full id", () => {
  const aliases = Object.values(ALIASES);
  for (const type of ["investigator", "reviewer", "implementer"])
    expect(aliases).toContain(
      updated(decide(agent({ subagent_type: `dotclaude:${type}` }), ON)).model,
    );
});

test("with the route off, the hook gives no output", () => {
  expect(decide(agent({}), {})).toBeUndefined();
  expect(decide(agent({}), { [FALLBACK_ENV.name]: "module" })).toBeUndefined();
});

test("a call of another tool gives no output", () => {
  expect(decide({ ...agent({}), tool_name: "Bash" }, ON)).toBeUndefined();
});

test("an explicit model or effort stays as the input set it", () => {
  expect(decide(agent({ model: "opus" }), ON)).toBeUndefined();
  expect(decide(agent({ effort: "low" }), ON)).toBeUndefined();
});

test("a fork gives no output", () => {
  expect(decide(agent({ subagent_type: "fork" }), ON)).toBeUndefined();
});

test("a variable that defeats the router gives no output", () => {
  for (const name of [
    "CLAUDE_CODE_EFFORT_LEVEL",
    "CLAUDE_CODE_SUBAGENT_MODEL_FORCE",
  ])
    expect(decide(agent({}), { ...ON, [name]: "low" })).toBeUndefined();
});

test("the effort that the user set caps the effort of the class", () => {
  const input = agent({ subagent_type: "dotclaude:reviewer" });
  expect(updated(decide(input, ON, "low")).effort).toBe("low");
  expect(updated(decide(input, ON)).effort).toBe("medium");
});

test("a task of no class gives no output", () => {
  const input = agent({
    subagent_type: "general-purpose",
    prompt: "Hello.",
    description: "greet",
  });
  expect(decide(input, ON)).toBeUndefined();
});

test("the script reads the payload from `stdin`, and prints nothing on bad input or with the route off", () => {
  const script = path.join(
    import.meta.dirname,
    "../../plugins/dotclaude/features/router/cli.mjs",
  );
  const run = (input, env) =>
    spawnSync("node", [script], {
      input,
      env: { PATH: process.env.PATH, ...env },
      encoding: "utf8",
    });
  const routed = run(JSON.stringify(agent({})), ON);
  expect(JSON.parse(routed.stdout).hookSpecificOutput.updatedInput.model).toBe(
    "haiku",
  );
  expect(run(JSON.stringify(agent({})), {}).stdout).toBe("");
  const bad = run("not json", ON);
  expect(bad.stdout).toBe("");
  expect(bad.status).toBe(0);
});
