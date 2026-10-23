// The paid recipes of the gate at red (spec `usage-awareness`, "Gate at Red") against the recipes of the `justfile`.

import { expect, test } from "bun:test";
import {
  PAID_RECIPES,
  runsPaidRecipe,
} from "../../../plugins/claudetto/slices/guard/domain/usage.ts";

test("each paid recipe is a recipe of the `justfile`", async () => {
  const justfile = await Bun.file("justfile").text();
  for (const recipe of PAID_RECIPES)
    expect(justfile).toMatch(new RegExp(`^${recipe}\\b.*:`, "m"));
});

test("a command is paid when `just` runs a paid recipe, in a pipe or with a flag first", () => {
  expect(runsPaidRecipe("just sandbox")).toBe(true);
  expect(runsPaidRecipe("just --quiet eval --model haiku")).toBe(true);
  expect(runsPaidRecipe("cd x && just sandbox-alone claudetto")).toBe(true);
  expect(runsPaidRecipe("just lab")).toBe(false);
  expect(runsPaidRecipe("echo just sandbox")).toBe(false);
});
