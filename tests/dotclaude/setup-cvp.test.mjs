// The CVP gate of setup: the answer and the probe result decide `claude-mythos-5-1`.
// The process call is a fixture, so no test runs `claude`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  decideModel,
  FABLE,
  MYTHOS,
  PROBE,
  withCvp,
} from "../../plugins/dotclaude/features/setup/cvp.mjs";

const PROFILE = JSON.parse(
  fs.readFileSync(
    path.join(
      import.meta.dirname,
      "../../plugins/dotclaude/features/setup/profile.json",
    ),
    "utf8",
  ),
);
const served = (...models) => ({
  status: 0,
  stdout: JSON.stringify({
    is_error: false,
    modelUsage: Object.fromEntries(models.map((m) => [m, {}])),
  }),
});
/** Run the gate with a fixture process. Returns the models, the said lines, and the calls. */
function gate(answer, result) {
  const calls = [];
  const said = [];
  const run = (...call) => {
    calls.push(call);
    if (result instanceof Error) throw result;
    return result;
  };
  const out = withCvp(PROFILE, answer, (line) => said.push(line), run);
  return { models: out.availableModels, said, calls };
}

test("yes and served by Mythos 5.1: Mythos is in and Fable is out", () => {
  const r = gate("yes", served(MYTHOS));
  expect(r.models).toContain(MYTHOS);
  expect(r.models).not.toContain(FABLE);
  expect(r.models).toHaveLength(PROFILE.availableModels.length);
  expect(r.said).toEqual([]);
  expect(r.calls).toHaveLength(1);
});

test("yes and replaced by another model: Fable stays and the reason names the model", () => {
  for (const models of [
    ["claude-sonnet-5-5"],
    [MYTHOS, "claude-sonnet-5-5"],
    [],
  ]) {
    const r = gate("yes", served(...models));
    expect(r.models).toContain(FABLE);
    expect(r.models).not.toContain(MYTHOS);
    expect(r.said).toHaveLength(1);
  }
  expect(gate("yes", served("claude-sonnet-5-5")).said[0]).toContain(
    "claude-sonnet-5-5",
  );
});

test("yes and an error: Fable stays for a non-zero exit, bad JSON, a missing `modelUsage`, and a failed call", () => {
  const bad = [
    { status: 1, stdout: served(MYTHOS).stdout },
    { status: 0, stdout: "not json" },
    { status: 0, stdout: "{}" },
    { status: 0, stdout: "null" },
    { status: null, stdout: "" },
    new Error("spawn claude ENOENT"),
  ];
  for (const result of bad) {
    const r = gate("yes", result);
    expect(r.models).toContain(FABLE);
    expect(r.models).not.toContain(MYTHOS);
    expect(r.said).toHaveLength(1);
  }
});

test("no, or any other answer: no probe runs and Fable stays", () => {
  for (const answer of ["no", "", undefined, "YES maybe"]) {
    const r = gate(answer, served(MYTHOS));
    expect(r.calls).toEqual([]);
    expect(r.models).toEqual(PROFILE.availableModels);
    expect(r.models).toContain(FABLE);
    expect(r.said).toEqual([]);
  }
});

test("`decideModel` is pure: the same input gives the same output, and no probe on no", () => {
  expect(decideModel("yes", served(MYTHOS))).toEqual(
    decideModel("yes", served(MYTHOS)),
  );
  expect(decideModel("no", served(MYTHOS)).model).toBe(FABLE);
  expect(decideModel("yes", null).model).toBe(FABLE);
});

test("the probe asks for JSON from Mythos 5.1 and allows only Mythos 5.1 for the call", () => {
  const [command, args] = PROBE;
  expect(command).toBe("claude");
  expect(args).toContain("-p");
  expect(args[args.indexOf("--model") + 1]).toBe(MYTHOS);
  expect(args[args.indexOf("--output-format") + 1]).toBe("json");
  expect(JSON.parse(args[args.indexOf("--settings") + 1])).toEqual({
    availableModels: [MYTHOS],
  });
});

test("a stricter list in another scope makes the gate fail closed: Claude Code serves another model", () => {
  // Fixture of the observed fallback: `is_error` is false, but `modelUsage` names Sonnet.
  const fallback = {
    status: 0,
    stdout: JSON.stringify({
      is_error: false,
      modelUsage: { "claude-sonnet-5-5": {} },
    }),
  };
  expect(gate("yes", fallback).models).toContain(FABLE);
});
